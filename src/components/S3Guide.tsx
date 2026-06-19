import React, { useState } from "react";
import { HelpCircle, Copy, Check, ShieldAlert, Settings, FileText } from "lucide-react";

export default function S3Guide() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const corsPolicy = `[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"]
  }
]`;

  const iamPolicy = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetBucketLocation",
        "s3:HeadBucket"
      ],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
    }
  ]
}`;

  return (
    <div id="s3-guide-root" className="bg-white border border-slate-200 rounded-3xl p-6 text-slate-600 shadow-sm space-y-6">
      <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
        <div className="bg-indigo-50 p-2.5 rounded-2xl text-indigo-600">
          <HelpCircle size={24} />
        </div>
        <div>
          <h3 className="font-sans font-bold text-lg text-slate-800">AWS S3 Integration Guide</h3>
          <p className="text-xs text-slate-500">Connect your actual S3 bucket for secure storage and backup.</p>
        </div>
      </div>

      <div className="space-y-5 text-xs leading-relaxed">
        {/* Step 1 */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-slate-800 font-bold">
            <span className="flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-full w-5 h-5 text-xs font-bold">1</span>
            <span>Create an S3 Bucket</span>
          </div>
          <p className="text-slate-500 pl-7">
            Log into your AWS Console, navigate to S3, and create a bucket. Note down your 
            <strong className="text-slate-700"> Bucket Name</strong> and <strong className="text-slate-700">Region</strong> (e.g., <code className="bg-slate-150 text-indigo-600 p-1.5 rounded font-mono font-medium">us-east-1</code>).
          </p>
        </div>

        {/* Step 2 */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-slate-800 font-bold">
            <span className="flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-full w-5 h-5 text-xs font-bold">2</span>
            <span>Configure CORS (Cross-Origin Resource Sharing)</span>
          </div>
          <p className="text-slate-500 pl-7 pb-2">
            In your S3 bucket settings, scroll down to <strong className="text-slate-700">CORS configuration</strong> and paste this JSON rule to allow secure browser transfers.
          </p>
          <div className="pl-7 relative">
            <div className="flex items-center justify-between text-[11px] bg-[#1E293B] px-4 py-2.5 rounded-t-2xl border-t border-x border-slate-850 font-mono text-slate-300">
              <span>S3 CORS JSON Policy</span>
              <button
                onClick={() => handleCopy(corsPolicy, "cors")}
                className="flex items-center space-x-1 hover:text-white transition-colors cursor-pointer"
                id="copy-cors-btn"
              >
                {copiedSection === "cors" ? (
                  <>
                    <Check size={12} className="text-emerald-400" />
                    <span className="text-emerald-400 font-sans">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span className="font-sans">Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="bg-slate-900 p-4 rounded-b-2xl border-b border-x border-slate-850 font-mono text-[10px] text-blue-50 overflow-x-auto max-h-36 shadow-inner">
              {corsPolicy}
            </pre>
          </div>
        </div>

        {/* Step 3 */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-slate-800 font-bold">
            <span className="flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-full w-5 h-5 text-xs font-bold">3</span>
            <span>Create IAM Credentials with Minimal Permissions</span>
          </div>
          <p className="text-slate-500 pl-7 pb-2">
            Go to AWS IAM, create a new User with <strong className="text-slate-700">Programmatic Access</strong>, and attach an inline policy granting get/put access to your specific bucket.
          </p>
          <div className="pl-7 relative">
            <div className="flex items-center justify-between text-[11px] bg-[#1E293B] px-4 py-2.5 rounded-t-2xl border-t border-x border-slate-850 font-mono text-slate-300">
              <span>IAM S3 Policy (Strict Policy)</span>
              <button
                onClick={() => handleCopy(iamPolicy, "iam")}
                className="flex items-center space-x-1 hover:text-white transition-colors cursor-pointer"
                id="copy-iam-btn"
              >
                {copiedSection === "iam" ? (
                  <>
                    <Check size={12} className="text-emerald-400" />
                    <span className="text-emerald-400 font-sans">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span className="font-sans">Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="bg-slate-900 p-4 rounded-b-2xl border-b border-x border-slate-850 font-mono text-[10px] text-blue-50 overflow-x-auto max-h-36 shadow-inner font-light">
              {iamPolicy}
            </pre>
          </div>
        </div>
      </div>

      <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 flex items-start space-x-3 text-amber-900 shadow-sm">
        <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={16} />
        <div className="text-[11px] leading-normal text-amber-850">
          <strong className="text-slate-800 font-bold">Security Invariant:</strong> Your AWS credentials are saved strictly in your local browser’s secure storage. They are sent directly over safe endpoint calls to the Node.js middleware wrapper solely as ephemeral headers, never persisted anywhere else on our server. Keep your AWS Secrets safe and rotate keys periodically!
        </div>
      </div>
    </div>
  );
}
