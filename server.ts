import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { S3Client, ListObjectsV2Command, PutObjectCommand, GetObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Helper to instantiate active S3 client dynamically from client headers
function getS3Client(req: express.Request) {
  const accessKeyId = req.headers["x-aws-access-key-id"] as string;
  const secretAccessKey = req.headers["x-aws-secret-access-key"] as string;
  const region = req.headers["x-aws-region"] as string;

  if (!accessKeyId || !secretAccessKey || !region) {
    throw new Error("Missing AWS credentials in request headers");
  }

  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

// 1. Verify credentials and bucket connectivity
app.post("/api/s3/verify", async (req, res) => {
  try {
    const bucket = req.headers["x-aws-bucket"] as string;
    if (!bucket) {
      return res.status(400).json({ success: false, error: "Missing x-aws-bucket header" });
    }
    const client = getS3Client(req);
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    res.json({ success: true, message: "Successfully connected to AWS S3 bucket!" });
  } catch (err: any) {
    console.error("S3 Verification error:", err);
    res.status(400).json({ success: false, error: err.message || String(err) });
  }
});

// 2. List objects (or virtual folders/albums)
app.post("/api/s3/list", async (req, res) => {
  try {
    const bucket = req.headers["x-aws-bucket"] as string;
    const prefix = req.body.prefix || ""; // prefix for subfolders/albums
    const delimiter = req.body.delimiter || "/"; // delimiter for listing folder-like layouts

    if (!bucket) {
      return res.status(400).json({ success: false, error: "Missing x-aws-bucket header" });
    }

    const client = getS3Client(req);
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      Delimiter: delimiter,
    });

    const response = await client.send(command);
    
    // Parse response
    const albums = response.CommonPrefixes?.map(p => p.Prefix) || [];
    const files = response.Contents?.map(f => ({
      key: f.Key || "",
      size: f.Size || 0,
      lastModified: f.LastModified,
    })) || [];

    res.json({
      success: true,
      albums,
      files,
    });
  } catch (err: any) {
    console.error("S3 List error:", err);
    res.status(400).json({ success: false, error: err.message || String(err) });
  }
});

// 3. Generate GET presigned URL for viewing multiple keys
app.post("/api/s3/get-urls", async (req, res) => {
  try {
    const bucket = req.headers["x-aws-bucket"] as string;
    const keys = req.body.keys as string[];

    if (!bucket) {
      return res.status(400).json({ success: false, error: "Missing x-aws-bucket header" });
    }
    if (!keys || !Array.isArray(keys)) {
      return res.status(400).json({ success: false, error: "Missing keys array in request body" });
    }

    const client = getS3Client(req);
    const urls: Record<string, string> = {};

    for (const key of keys) {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });
      // URL expires in 1 hour (3600 seconds)
      const url = await getSignedUrl(client, command, { expiresIn: 3600 });
      urls[key] = url;
    }

    res.json({ success: true, urls });
  } catch (err: any) {
    console.error("S3 Get URL error:", err);
    res.status(200).json({ success: false, error: err.message || String(err) });
  }
});

// 4. Generate PUT presigned URL for uploading a file directly to S3
app.post("/api/s3/upload-url", async (req, res) => {
  try {
    const bucket = req.headers["x-aws-bucket"] as string;
    const { key, contentType } = req.body;

    if (!bucket) {
      return res.status(400).json({ success: false, error: "Missing x-aws-bucket header" });
    }
    if (!key) {
      return res.status(400).json({ success: false, error: "Missing key in request body" });
    }

    const client = getS3Client(req);
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(client, command, { expiresIn: 900 }); // 15 mins for upload
    res.json({ success: true, url });
  } catch (err: any) {
    console.error("S3 Upload URL error:", err);
    res.status(400).json({ success: false, error: err.message || String(err) });
  }
});

// 5. Create directory placeholder
app.post("/api/s3/create-folder", async (req, res) => {
  try {
    const bucket = req.headers["x-aws-bucket"] as string;
    const { prefix } = req.body;

    if (!bucket) {
      return res.status(400).json({ success: false, error: "Missing x-aws-bucket header" });
    }
    if (!prefix) {
      return res.status(400).json({ success: false, error: "Missing prefix in request body" });
    }

    const client = getS3Client(req);
    const folderKey = prefix.endsWith("/") ? prefix : `${prefix}/`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: folderKey,
    });

    await client.send(command);
    res.json({ success: true, key: folderKey });
  } catch (err: any) {
    console.error("S3 Create folder error:", err);
    res.status(400).json({ success: false, error: err.message || String(err) });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
