import React, { useState } from "react";
import { S3BucketConfig } from "../types";
import { Shield, Plus, Database, Trash2, CheckCircle2, AlertTriangle, RefreshCw, Layers } from "lucide-react";
import { getApiUrl } from "../lib/api";

interface BucketManagerProps {
  buckets: S3BucketConfig[];
  activeBucketId: string | null;
  onSelectBucket: (id: string) => void;
  onAddBucket: (bucket: Omit<S3BucketConfig, "id" | "isVerified">) => Promise<boolean>;
  onDeleteBucket: (id: string) => void;
  isSimulated: boolean;
  onToggleSimulated: (simulated: boolean) => void;
}

export default function BucketManager({
  buckets,
  activeBucketId,
  onSelectBucket,
  onAddBucket,
  onDeleteBucket,
  isSimulated,
  onToggleSimulated,
}: BucketManagerProps) {
  const [name, setName] = useState("");
  const [bucketName, setBucketName] = useState("");
  const [region, setRegion] = useState("us-east-1");
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !bucketName || !region || !accessKeyId || !secretAccessKey) return;
    
    setTesting(true);
    setTestResult(null);

    // Try testing first
    try {
      const res = await fetch(getApiUrl("/api/s3/verify"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-aws-access-key-id": accessKeyId,
          "x-aws-secret-access-key": secretAccessKey,
          "x-aws-region": region,
          "x-aws-bucket": bucketName,
        }
      });
      const data = await res.json();
      if (data.success) {
        const added = await onAddBucket({
          name,
          bucketName,
          region,
          accessKeyId,
          secretAccessKey,
        });

        if (added) {
          setTestResult({ success: true, message: "Bucket verified and added successfully!" });
          setName("");
          setBucketName("");
          setAccessKeyId("");
          setSecretAccessKey("");
        }
      } else {
        setTestResult({ 
          success: false, 
          message: data.error || "Failed to verify bucket credentials. Double check policies & CORS properties." 
        });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || "Network test failed." });
    } finally {
      setTesting(false);
    }
  };

  const currentActive = buckets.find(b => b.id === activeBucketId);

  return (
    <div id="bucket-manager-root" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Simulation Banner & Bucket Selector */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* State Banner - styled like indigo-600 Bento layout or warm alert block */}
        <div className={`p-6 rounded-3xl border transition-all shadow-sm ${
          isSimulated 
            ? "bg-amber-50 border-amber-200 text-amber-900"
            : activeBucketId 
              ? "bg-indigo-50 border-indigo-150 text-indigo-900"
              : "bg-slate-50 border-slate-200 text-slate-800"
        }`}>
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${
                isSimulated 
                  ? "bg-amber-100 text-amber-800 border border-amber-200" 
                  : "bg-indigo-100 text-indigo-800 border border-indigo-200"
              }`}>
                Current Provider
              </span>
              <h2 className={`text-xl font-bold font-sans mt-2 ${
                isSimulated ? "text-amber-900" : "text-slate-850"
              }`}>
                {isSimulated 
                  ? "Simulated Local Sandbox Mode" 
                  : currentActive 
                    ? `S3: ${currentActive.name}`
                    : "No S3 Provider Selected"}
              </h2>
              <p className={`text-xs mt-1.5 leading-relaxed ${
                isSimulated ? "text-amber-805" : "text-slate-600"
              }`}>
                {isSimulated 
                  ? "You are backed up to local browser IndexedDB state. No AWS files will stream. Turn this off to plug in actual AWS S3 buckets."
                  : currentActive 
                    ? `Syncing files directly to Amazon S3 bucket "${currentActive.bucketName}" in standard region "${currentActive.region}".`
                    : "Configure or select an active AWS S3 storage profile to activate cloud syncing characteristics."}
              </p>
            </div>
            
            <button
              onClick={() => onToggleSimulated(!isSimulated)}
              className={`p-3 rounded-2xl border flex items-center space-x-2 font-bold text-xs shrink-0 self-start sm:self-center transition-all cursor-pointer ${
                isSimulated 
                  ? "bg-indigo-650 border-indigo-700 text-white shadow-md shadow-indigo-600/15 hover:bg-indigo-600"
                  : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
              }`}
              id="sim-toggle-btn"
            >
              <Layers size={14} />
              <span>{isSimulated ? "Connect Live S3" : "Switch Local Sim"}</span>
            </button>
          </div>
        </div>

        {/* Saved Buckets List - styled white card with slate borders */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-sans font-bold text-slate-800 flex items-center space-x-2 text-sm">
              <Database size={16} className="text-indigo-600" />
              <span>Configured AWS S3 Bulks</span>
            </h3>
            <span className="text-slate-500 font-mono text-[10px]">{buckets.length} Active Profiles</span>
          </div>

          {buckets.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500 space-y-1">
              <p>No storage buckets configured.</p>
              <p>Create a profile using the form to persist cloud backup operations.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {buckets.map((b) => {
                const isActive = b.id === activeBucketId && !isSimulated;
                return (
                  <div
                    key={b.id}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      isActive 
                        ? "bg-indigo-50/50 border-indigo-200" 
                        : "bg-slate-50/50 border-slate-150 hover:border-slate-200"
                    }`}
                  >
                    <button
                      onClick={() => {
                        onToggleSimulated(false);
                        onSelectBucket(b.id);
                      }}
                      className="flex-1 text-left flex items-start space-x-3 cursor-pointer"
                      id={`select-bucket-${b.id}`}
                    >
                      <div className={`p-2.5 rounded-xl border shrink-0 ${
                        isActive 
                          ? "bg-indigo-100 border-indigo-200 text-indigo-700" 
                          : "bg-white border-slate-200 text-slate-400"
                      }`}>
                        <Database size={16} />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-bold text-slate-800">{b.name}</span>
                          {b.isVerified && (
                            <CheckCircle2 size={13} className="text-indigo-650" />
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono">
                          {b.bucketName} ({b.region})
                        </p>
                      </div>
                    </button>

                    <button
                      onClick={() => onDeleteBucket(b.id)}
                      className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      id={`delete-bucket-${b.id}`}
                      title="Remove Profile"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* S3 Configuration Form - elegant white card */}
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 mb-5">
          <Shield size={16} className="text-indigo-600" />
          <h3 className="font-sans font-bold text-sm text-slate-850">Add New S3 Storage Profile</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Connection Nickname
            </label>
            <input
              type="text"
              required
              placeholder="e.g. My Travel Album"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-indigo-550 text-slate-800 placeholder-slate-400 rounded-2xl py-2.5 px-4 text-xs focus:outline-none transition-colors"
              id="bucket-nickname"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                AWS Bucket Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. photo-backup"
                value={bucketName}
                onChange={(e) => setBucketName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-indigo-550 text-slate-800 placeholder-slate-400 rounded-2xl py-2.5 px-4 text-xs focus:outline-none transition-colors"
                id="bucket-aws-name"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                AWS Region
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 text-slate-800 rounded-2xl py-2.5 px-4 text-xs focus:outline-none transition-colors cursor-pointer"
                id="bucket-region-select"
              >
                <option value="us-east-1">US East (N. Virginia)</option>
                <option value="us-east-2">US East (Ohio)</option>
                <option value="us-west-1">US West (N. California)</option>
                <option value="us-west-2">US West (Oregon)</option>
                <option value="eu-west-1">Europe (Ireland)</option>
                <option value="eu-west-2">Europe (London)</option>
                <option value="eu-central-1">Europe (Frankfurt)</option>
                <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                <option value="ap-northeast-1">Asia Pacific (Tokyo)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              AWS Access Key ID
            </label>
            <input
              type="text"
              required
              placeholder="e.g. AKIAIOSFODNN7EXAMPLE"
              value={accessKeyId}
              onChange={(e) => setAccessKeyId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 text-slate-800 placeholder-slate-400 rounded-2xl py-2.5 px-4 text-xs focus:outline-none transition-colors font-mono"
              id="bucket-access-key"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              AWS Secret Access Key
            </label>
            <input
              type="password"
              required
              placeholder="Your confidential Secret Access Key"
              value={secretAccessKey}
              onChange={(e) => setSecretAccessKey(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 text-slate-800 placeholder-slate-400 rounded-2xl py-2.5 px-4 text-xs focus:outline-none transition-colors font-mono"
              id="bucket-secret-key"
            />
          </div>

          <button
            type="submit"
            disabled={testing}
            className="w-full bg-indigo-600 hover:bg-indigo-550 border border-transparent text-white font-sans font-bold rounded-2xl py-3 px-4 text-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer shadow-sm disabled:opacity-50"
            id="bucket-submit-btn"
          >
            {testing ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                <span>Verifying S3 Connection...</span>
              </>
            ) : (
              <>
                <Plus size={13} />
                <span>Test & Create Storage Profile</span>
              </>
            )}
          </button>
        </form>

        {testResult && (
          <div className={`mt-4 p-4 rounded-2xl border text-xs leading-relaxed flex items-start space-x-2 ${
            testResult.success 
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}>
            {testResult.success ? (
              <CheckCircle2 size={16} className="shrink-0 text-emerald-600 mt-0.5" />
            ) : (
              <AlertTriangle size={16} className="shrink-0 text-rose-600 mt-0.5" />
            )}
            <div>
              <p className="font-bold">{testResult.success ? "Connection Secure" : "Configuration Error"}</p>
              <p className="text-[11px] opacity-90 mt-1">{testResult.message}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
