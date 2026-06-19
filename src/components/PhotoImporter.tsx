import React, { useState, useRef } from "react";
import { UploadQueueItem, S3BucketConfig } from "../types";
import { Upload, X, Check, AlertTriangle, Image as ImageIcon, Sparkles, RefreshCw, Layers } from "lucide-react";
import { getApiUrl } from "../lib/api";

interface PhotoImporterProps {
  activeBucket: S3BucketConfig | null;
  isSimulated: boolean;
  activeAlbumPrefix: string | null;
  albums: { name: string; prefix: string }[];
  onUploadSuccess: (key: string, url: string, size: number) => void;
  onRefresh: () => void;
}

export default function PhotoImporter({
  activeBucket,
  isSimulated,
  activeAlbumPrefix,
  albums,
  onUploadSuccess,
  onRefresh,
}: PhotoImporterProps) {
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [compressImages, setCompressImages] = useState(true);
  const [targetAlbumPrefix, setTargetAlbumPrefix] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize album selection from parent view
  React.useEffect(() => {
    if (activeAlbumPrefix) {
      setTargetAlbumPrefix(activeAlbumPrefix);
    } else if (albums.length > 0 && !targetAlbumPrefix) {
      setTargetAlbumPrefix(albums[0].prefix);
    }
  }, [activeAlbumPrefix, albums]);

  // Handle drag configurations
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFiles = (files: FileList) => {
    const newItems: UploadQueueItem[] = [];
    const chosenAlbum = targetAlbumPrefix || (albums.length > 0 ? albums[0].prefix : "albums/uncategorized/");

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue; // Images only

      newItems.push({
        id: Math.random().toString(36).substring(7),
        file,
        name: file.name,
        size: file.size,
        status: "pending",
        progress: 0,
        albumPrefix: chosenAlbum,
      });
    }

    setQueue((prev) => [...prev, ...newItems]);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFiles(e.target.files);
    }
  };

  const handleRemove = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClear = () => {
    setQueue([]);
  };

  // Helper code for image resizing & compression in the browser
  const resizeImage = (file: File): Promise<Blob | File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1600;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve(new File([blob], file.name, { type: "image/jpeg" }));
              } else {
                resolve(file);
              }
            },
            "image/jpeg",
            0.85 // 85% JPEG quality
          );
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  // Execute upload queue sequence
  const startUpload = async () => {
    if (queue.length === 0 || uploading) return;
    setUploading(true);

    const activeItems = queue.filter((item) => item.status === "pending" || item.status === "failed");

    for (const item of activeItems) {
      // Set to uploading
      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: "uploading", progress: 20 } : q))
      );

      try {
        let uploadFile = item.file;
        if (compressImages) {
          uploadFile = (await resizeImage(item.file)) as File;
        }

        // Final S3 path destination
        const sanitizedAlbumName = item.albumPrefix.endsWith("/") ? item.albumPrefix : `${item.albumPrefix}/`;
        const s3Key = `${sanitizedAlbumName}${Date.now()}_${item.name.replace(/\s+/g, "_")}`;

        if (isSimulated) {
          // Local storage workflow simulation
          await new Promise((r) => setTimeout(r, 600)); // smooth visual simulation

          const reader = new FileReader();
          const base64Data = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(uploadFile);
          });

          onUploadSuccess(s3Key, base64Data, uploadFile.size);

          setQueue((prev) =>
            prev.map((q) => (q.id === item.id ? { ...q, status: "completed", progress: 100 } : q))
          );
        } else {
          if (!activeBucket) throw new Error("No active bucket config loaded.");

          // S3 live transfer workflow
          setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, progress: 40 } : q)));

          // 1. Ask Node proxy for direct presigned write URL
          const res = await fetch(getApiUrl("/api/s3/upload-url"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-aws-access-key-id": activeBucket.accessKeyId,
              "x-aws-secret-access-key": activeBucket.secretAccessKey,
              "x-aws-region": activeBucket.region,
              "x-aws-bucket": activeBucket.bucketName,
            },
            body: JSON.stringify({
              key: s3Key,
              contentType: uploadFile.type,
            }),
          });

          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || "Failed to generate PUT presigned grant.");
          }

          const { url } = await res.json();
          setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, progress: 70 } : q)));

          // 2. Upload photo from user browser direct to the generated pre-signed S3 end
          const uploadResponse = await fetch(url, {
            method: "PUT",
            headers: {
              "Content-Type": uploadFile.type,
            },
            body: uploadFile,
          });

          if (!uploadResponse.ok) {
            throw new Error(`AWS S3 write error. Check your S3 CORS permissions! (Status code ${uploadResponse.status})`);
          }

          // 3. Request a GET presigned URL for instant local feedback rendering
          const verifyGet = await fetch(getApiUrl("/api/s3/get-urls"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-aws-access-key-id": activeBucket.accessKeyId,
              "x-aws-secret-access-key": activeBucket.secretAccessKey,
              "x-aws-region": activeBucket.region,
              "x-aws-bucket": activeBucket.bucketName,
            },
            body: JSON.stringify({ keys: [s3Key] }),
          });

          if (!verifyGet.ok) {
            throw new Error("Uploaded but feedback URL retrieval failed.");
          }

          const getUrls = await verifyGet.json();
          const viewUrl = getUrls.success && getUrls.urls[s3Key] ? getUrls.urls[s3Key] : "";

          onUploadSuccess(s3Key, viewUrl, uploadFile.size);

          setQueue((prev) =>
            prev.map((q) => (q.id === item.id ? { ...q, status: "completed", progress: 100 } : q))
          );
        }
      } catch (err: any) {
        console.error("Upload process error for", item.name, err);
        setQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: "failed", error: err.message || String(err) } : q))
        );
      }
    }

    setUploading(false);
    onRefresh();
  };

  return (
    <div id="photo-importer-root" className="grid grid-cols-1 md:grid-cols-12 gap-6">
      {/* Upload Zone & controls */}
      <div className="md:col-span-6 space-y-5">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
          <h3 className="font-sans font-bold text-slate-800 text-sm">Upload Photos to S3</h3>

          {/* Config row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5">
                Target Backup Album
              </label>
              <select
                value={targetAlbumPrefix}
                onChange={(e) => setTargetAlbumPrefix(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-505 rounded-2xl p-2.5 focus:outline-none text-slate-700 cursor-pointer text-xs"
                id="target-album-importer"
              >
                {albums.map((al) => (
                  <option key={al.prefix} value={al.prefix}>
                    {al.name}
                  </option>
                ))}
                {albums.length === 0 && (
                  <option value="albums/uncategorized/">Uncategorized</option>
                )}
              </select>
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center space-x-2.5 bg-slate-50 border border-slate-200 rounded-2xl p-3 select-none cursor-pointer hover:border-indigo-200 transition-colors">
                <input
                  type="checkbox"
                  checked={compressImages}
                  onChange={(e) => setCompressImages(e.target.checked)}
                  className="rounded border-slate-350 bg-white text-indigo-650 focus:ring-0 focus:ring-offset-0 w-4 h-4"
                />
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-750">Optimize Images</span>
                  <p className="text-[9px] text-slate-400">Resizes to fast size on S3</p>
                </div>
              </label>
            </div>
          </div>

          {/* Drag area */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-3xl p-8 text-center transition-all duration-300 flex flex-col items-center justify-center space-y-3 ${
              dragActive
                ? "border-indigo-550 bg-indigo-50 text-indigo-600 scale-[0.99]"
                : "border-slate-200 hover:border-indigo-200 text-slate-500 hover:bg-slate-50/50"
            }`}
            id="drag-and-drop-container"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept="image/*"
              className="hidden"
            />
            
            <div className={`p-4 rounded-2xl border transition-all ${
              dragActive 
                ? "bg-indigo-100 border-indigo-200 text-indigo-400" 
                : "bg-slate-50 border-slate-200 text-slate-400 group-hover:text-slate-600"
            }`}>
              <Upload size={28} />
            </div>

            <div className="space-y-1">
              <p className="text-slate-800 text-xs font-bold">Drag & Drop Photos Here</p>
              <p className="text-[10px] text-slate-400">or click to browse your system folders</p>
            </div>

            <div className="border border-slate-150 bg-slate-50 rounded-full px-3.5 py-1.5 flex items-center space-x-1.5 text-[9px] text-slate-600">
              <Sparkles size={10} className="text-indigo-600" />
              <span>Saves as high-res JPEGs for ultra backups</span>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Progress Queue */}
      <div className="md:col-span-6 flex flex-col bg-white border border-slate-200 rounded-3xl p-6 min-h-[300px] shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="space-y-0.5">
            <h3 className="font-sans font-bold text-slate-850 text-sm">Backup Pipeline Queue</h3>
            <p className="text-[10px] text-slate-400">{queue.length} files total queued</p>
          </div>

          {queue.length > 0 && (
            <button
              onClick={handleClear}
              className="text-[10px] text-rose-650 hover:text-rose-700 font-bold px-2.5 py-1.5 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              id="clear-queue-btn"
              disabled={uploading}
            >
              Clear Completed
            </button>
          )}
        </div>

        {queue.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-1.5">
            <ImageIcon size={24} className="text-slate-300" />
            <p className="text-xs font-bold text-slate-700">Backup pipeline empty</p>
            <p className="text-[10px] max-w-xs mx-auto">Drop files on the upload panel to stage backups to your active S3 bucket.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-between">
            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {queue.map((item) => (
                <div
                  key={item.id}
                  className="bg-slate-50/75 p-3.5 rounded-2xl border border-slate-150 flex items-center justify-between space-x-3 text-xs"
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-slate-800 font-bold truncate pr-2">{item.name}</p>
                      <span className="text-[9px] text-slate-500 shrink-0 font-mono">
                        {Math.round(item.size / 1024)} KB
                      </span>
                    </div>

                    {/* Progress slider */}
                    {item.status === "uploading" && (
                      <div className="w-full bg-slate-250 h-1 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full transition-all duration-300"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                    )}

                    {item.status === "failed" && (
                      <p className="text-[9px] text-rose-600 truncate font-mono">
                        {item.error || "Upload failed. Verify CORS configuration."}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center space-x-1.5 pl-1">
                    {item.status === "pending" && (
                      <button
                        onClick={() => handleRemove(item.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-slate-100 cursor-pointer"
                        title="Remove"
                      >
                        <X size={12} />
                      </button>
                    )}

                    {item.status === "uploading" && (
                      <RefreshCw className="text-indigo-600 animate-spin" size={12} />
                    )}

                    {item.status === "completed" && (
                      <div className="bg-emerald-50 text-emerald-600 p-1 rounded-full border border-emerald-250">
                        <Check size={10} />
                      </div>
                    )}

                    {item.status === "failed" && (
                      <AlertTriangle className="text-rose-500" size={14} />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={startUpload}
              disabled={uploading || queue.every(q => q.status === "completed")}
              className="mt-6 w-full bg-indigo-600 hover:bg-indigo-550 disabled:opacity-50 text-white py-3.5 px-6 rounded-2xl text-xs font-sans font-bold transition-all cursor-pointer flex items-center justify-center space-x-2 shadow-md shadow-indigo-600/10"
              id="start-backup-btn"
            >
              {uploading ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Syncing to secure S3 storage...</span>
                </>
              ) : (
                <>
                  <Layers size={13} />
                  <span>Execute Sync & Upload Backup</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
