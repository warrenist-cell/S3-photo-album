export interface S3BucketConfig {
  id: string;
  name: string;      // Nickname of bucket config
  bucketName: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  isVerified: boolean;
}

export interface PhotoItem {
  id: string;
  key: string;            // S3 object key
  name: string;           // Clean file name
  size: number;
  lastModified?: string | Date;
  url: string;            // GET presigned URL or base64 (for local simulation)
  albumId: string;        // Derived folder name (e.g. "vacation")
}

export interface AlbumItem {
  id: string;
  name: string;           // Derived clean name
  prefix: string;         // S3 path prefix (e.g. "albums/vacation/")
  coverUrl?: string;      // Presigned get URL of the first image
  photoCount: number;
}

export interface UploadQueueItem {
  id: string;
  file: File;
  name: string;
  size: number;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number;
  error?: string;
  albumPrefix: string;
}
