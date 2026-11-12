"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div className="relative min-h-screen w-full bg-[#060913] text-white flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl backdrop-blur-2xl text-center space-y-4">
        <h1 className="text-xl font-semibold text-white">Authentication Notice</h1>
        <p className="text-xs text-fg-2 leading-relaxed">
          {error === "Configuration"
            ? "Google OAuth is not configured yet. Please check your GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET settings in .env."
            : error === "access_denied"
            ? "You cancelled the Google sign-in request."
            : error
            ? `An issue occurred during authentication: ${error}`
            : "An unexpected error occurred during sign-in."}
        </p>
        <div className="pt-2 flex flex-col gap-2.5">
          <Link
            href="/auth/signin"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#2F6BFF] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#2F6BFF]/90 transition-colors"
          >
            <RefreshCw className="size-3.5" />
            Try Again
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-1.5 text-xs text-fg-3 hover:text-white transition-colors py-1"
          >
            <ArrowLeft className="size-3.5" />
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#060913] flex items-center justify-center text-white">
          <div className="size-6 animate-spin rounded-full border-2 border-electric border-t-transparent" />
        </div>
      }
    >
      <ErrorContent />
    </React.Suspense>
  );
}
