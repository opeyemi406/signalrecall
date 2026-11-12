"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ArrowRight } from "lucide-react";

function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    await signIn("google", { callbackUrl });
  };

  return (
    <div className="min-h-screen bg-[#05060D] text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-[380px] text-center space-y-6">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0d1124] border border-white/10 ring-conic flex items-center justify-center">
            <span className="text-[12px] font-bold tracking-tight text-white">SR</span>
          </div>
          <span className="text-[16px] font-semibold tracking-tight text-white">
            SignalRecall
          </span>
        </Link>

        <p className="text-[15px] text-white/60 leading-relaxed">
          Sign in to open your trading signals, alerts, and Walrus memory vault.
        </p>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full inline-flex items-center justify-between pl-6 pr-2 py-2.5 rounded-full bg-[#F7F5EE] hover:bg-white text-[#05060D] text-[14px] font-semibold transition-colors disabled:opacity-60 cursor-pointer"
        >
          <span>{loading ? "Redirecting to Google..." : "Continue with Google"}</span>
          <span className="w-8 h-8 rounded-full bg-[#05060D] text-[#F7F5EE] flex items-center justify-center">
            <ArrowRight className="w-4 h-4" />
          </span>
        </button>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#05060D] text-white flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-[#2F6BFF] border-t-transparent animate-spin" />
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
