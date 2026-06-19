import React from "react";
import { PhotoItem } from "../types";
import { X, Download, Trash2, Calendar, HardDrive, MapPin, Hash, ExternalLink } from "lucide-react";

interface LightBoxProps {
  photo: PhotoItem | null;
  bucketName: string;
  region: string;
  isSimulated: boolean;
  onClose: () => void;
  onDelete: (photoId: string) => Promise<void>;
}

export default function LightBox({
  photo,
  bucketName,
  region,
  isSimulated,
  onClose,
  onDelete,
}: LightBoxProps) {
  if (!photo) return null;

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const s3Uri = isSimulated
    ? `s3://local-sandbox-bucket/${photo.key}`
    : `s3://${bucketName}/${photo.key}`;

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this backup from S3 bucket? This action cannot be undone.")) {
      await onDelete(photo.id);
      onClose();
    }
  };

  return (
    <div
      id="lightbox-overlay"
      className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col md:flex-row items-stretch justify-between animate-fade-in"
    >
      {/* Visual Canvas Area */}
      <div className="flex-1 relative flex items-center justify-center p-6 bg-black">
        {/* Top Control Overlay */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
          <span className="bg-slate-900/80 backdrop-blur-md border border-slate-800 text-[10px] font-mono text-slate-400 px-3 py-1 rounded-full pointer-events-auto">
            {photo.name}
          </span>
          <button
            onClick={onClose}
            className="bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 p-2 rounded-full transition-all pointer-events-auto shadow-lg cursor-pointer"
            id="lightbox-close-btn"
          >
            <X size={16} />
          </button>
        </div>

        {/* Big Preview Image */}
        <img
          src={photo.url}
          alt={photo.name}
          referrerPolicy="no-referrer"
          className="max-w-full max-h-[80vh] md:max-h-[85vh] object-contain rounded-lg shadow-2xl transition-transform duration-300"
        />
      </div>

      {/* Info Sidebar Section */}
      <div className="w-full md:w-80 shrink-0 bg-white border-t md:border-t-0 md:border-l border-slate-200 p-6 flex flex-col justify-between text-xs space-y-6">
        <div className="space-y-6">
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider">
              Backup Metadata
            </span>
            <h3 className="font-sans font-bold text-base text-slate-800 leading-snug">
              {photo.name}
            </h3>
          </div>

          <div className="space-y-4">
            {/* S3 URI details */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-150 space-y-1">
              <span className="text-[9px] font-bold text-slate-400 block uppercase">S3 Backup Target URI</span>
              <div className="flex items-center space-x-1.5 justify-between">
                <code className="font-mono text-slate-750 select-all overflow-x-auto text-[10px] whitespace-nowrap block flex-1">
                  {s3Uri}
                </code>
              </div>
            </div>

            {/* List metrics */}
            <div className="space-y-3.5 pt-1">
              <div className="flex items-center space-x-3 text-slate-600">
                <HardDrive size={14} className="text-indigo-600 shrink-0" />
                <div className="space-y-0.5">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">File Weight</span>
                  <span className="font-bold text-slate-850 text-xs">{formatSize(photo.size)}</span>
                </div>
              </div>

              <div className="flex items-center space-x-3 text-slate-600">
                <Calendar size={14} className="text-indigo-600 shrink-0" />
                <div className="space-y-0.5">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold font-sans">Synced Timestamp</span>
                  <span className="font-bold text-slate-850 text-xs text-sans">
                    {photo.lastModified
                      ? new Date(photo.lastModified).toLocaleString()
                      : "Just now"}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-3 text-slate-600">
                <MapPin size={14} className="text-indigo-600 shrink-0" />
                <div className="space-y-0.5">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold font-sans">Hosting Bucket</span>
                  <span className="font-bold text-slate-850 text-xs truncate max-w-[150px] block font-sans">
                    {isSimulated ? "IndexedDB Sandbox" : bucketName}
                  </span>
                </div>
              </div>

              {!isSimulated && (
                <div className="flex items-center space-x-3 text-slate-600">
                  <Hash size={14} className="text-indigo-600 shrink-0" />
                  <div className="space-y-0.5">
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">AWS Region</span>
                    <span className="font-bold text-slate-850 text-xs font-mono">{region}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions Button Panel */}
        <div className="space-y-2">
          <a
            href={photo.url}
            download={photo.name}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-indigo-600 hover:bg-indigo-550 border border-transparent text-white py-3 px-4 rounded-2xl font-bold transition-colors flex items-center justify-center space-x-2 text-center text-xs"
            id="lightbox-download-link"
          >
            <Download size={13} />
            <span>Download Backup File</span>
            <ExternalLink size={11} className="opacity-60" />
          </a>

          <button
            onClick={handleDelete}
            className="w-full bg-rose-50 hover:bg-rose-100/50 border border-rose-100 text-rose-650 hover:text-rose-700 py-3 px-4 rounded-2xl font-bold transition-colors flex items-center justify-center space-x-2 cursor-pointer text-xs"
            id="lightbox-delete-btn"
          >
            <Trash2 size={13} className="text-rose-600" />
            <span>Delete Secure Backup</span>
          </button>
        </div>
      </div>
    </div>
  );
}
