"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Lock,
  Radio,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const errorParam = searchParams.get("error");
  const { data: session, status } = useSession();

  const [loading, setLoading] = React.useState(false);
  const [configured, setConfigured] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    fetch("/api/auth/status")
      .then((res) => res.json())
      .then((data) => setConfigured(Boolean(data.configured)))
      .catch(() => setConfigured(false));
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signIn("google", { callbackUrl });
    } catch (err) {
      console.error("Sign in failed:", err);
      setLoading(false);
    }
  };

  // Determine friendly error message
  let errorMessage: string | null = null;
  if (errorParam === "OAuthSignin" || errorParam === "OAuthCallback") {
    errorMessage = "Could not authenticate with Google. Please check your network or try again.";
  } else if (errorParam === "OAuthCreateAccount" || errorParam === "EmailCreateAccount") {
    errorMessage = "Could not create user account. Please contact support.";
  } else if (errorParam === "Callback") {
    errorMessage = "Error during callback from Google. Check authorized redirect URIs in Google Cloud Console.";
  } else if (errorParam === "OAuthAccountNotLinked") {
    errorMessage = "An account with this email already exists with a different sign-in method.";
  } else if (errorParam === "SessionRequired") {
    errorMessage = "Your session expired. Please sign in to continue.";
  } else if (errorParam === "access_denied") {
    errorMessage = "Google sign-in was cancelled. You can sign in anytime when you are ready.";
  } else if (errorParam === "Configuration") {
    errorMessage = "Authentication configuration error. Please verify AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET in .env.";
  } else if (errorParam) {
    errorMessage = `Sign in error: ${errorParam}`;
  }

  return (
    <div className="relative min-h-screen w-full bg-[#060913] text-white flex flex-col justify-between selection:bg-[#2F6BFF] selection:text-white px-4 py-8">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 size-[650px] rounded-full bg-gradient-to-b from-[#2F6BFF]/15 via-[#6D5EF5]/10 to-transparent blur-3xl opacity-60" />
        <div className="absolute bottom-0 right-1/4 size-[400px] rounded-full bg-[#19D49A]/10 blur-3xl opacity-40" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 mx-auto w-full max-w-5xl flex items-center justify-between pb-6">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <svg
            width="26"
            height="26"
            viewBox="0 0 28 28"
            fill="none"
            className="shrink-0 transition-transform group-hover:scale-105"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="srSignInLogoGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#60A5FA" />
                <stop offset="100%" stopColor="#2F6BFF" />
              </linearGradient>
            </defs>
            <path d="M14 3L25 23H19.4L14 13L8.6 23H3L14 3Z" fill="url(#srSignInLogoGrad)" />
            <path d="M14 13L19.4 23H8.6L14 13Z" fill="#19D49A" fillOpacity="0.85" />
          </svg>
          <span className="text-base font-semibold tracking-tight text-white">
            Signal<span className="text-[#2F6BFF]">Recall</span>
          </span>
        </Link>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-fg-2 hover:text-white transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Back to Home
        </Link>
      </header>

      {/* Main Card */}
      <main className="relative z-10 mx-auto w-full max-w-[460px] my-auto">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-7 sm:p-9 shadow-2xl backdrop-blur-2xl">
          {/* Card Header */}
          <div className="text-center space-y-2 mb-6">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#2F6BFF]/30 bg-[#2F6BFF]/10 px-3 py-1 text-[11px] font-medium text-[#60A5FA]">
              <Lock className="size-3" />
              Authenticated Workspaces
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
              Sign in to SignalRecall
            </h1>
            <p className="text-xs sm:text-sm text-fg-2">
              Connect your Google account to access your personal signal terminal, custom alerts, and persistent Walrus Memory bank.
            </p>
          </div>

          {/* Already logged in notice */}
          {status === "authenticated" && session?.user && (
            <div className="mb-6 rounded-xl border border-[#19D49A]/30 bg-[#19D49A]/10 p-4 text-xs text-[#19D49A] space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="size-4 shrink-0" />
                <span>Signed in as {session.user.email}</span>
              </div>
              <p className="text-fg-2 text-[11px]">
                You are already authenticated. You can return directly to your dashboard.
              </p>
              <div className="pt-1">
                <Link
                  href={callbackUrl}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#19D49A] px-3.5 py-1.5 text-xs font-semibold text-black hover:bg-[#19D49A]/90 transition-colors"
                >
                  Continue to Workspace
                </Link>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300"
            >
              <AlertCircle className="size-4 shrink-0 text-red-400 mt-0.5" />
              <div className="space-y-1">
                <div className="font-semibold text-red-200">Authentication Alert</div>
                <div className="text-[11px] leading-relaxed">{errorMessage}</div>
              </div>
            </div>
          )}

          {/* Continue with Google Button */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="group relative flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white text-black font-semibold text-sm transition-all hover:bg-neutral-100 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-white/5"
            >
              {loading ? (
                <div className="size-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
              ) : (
                <svg className="size-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>{loading ? "Connecting to Google..." : "Continue with Google"}</span>
            </button>
          </div>

          {/* Credentials Status & Setup Assistance */}
          {configured === false && (
            <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                <KeyRound className="size-3.5 shrink-0" />
                Setup Note: Google OAuth Keys Pending
              </div>
              <p className="text-[11px] text-amber-200/80 leading-relaxed">
                Add <code className="text-white bg-black/40 px-1 py-0.5 rounded">AUTH_GOOGLE_ID</code> and{" "}
                <code className="text-white bg-black/40 px-1 py-0.5 rounded">AUTH_GOOGLE_SECRET</code> to your{" "}
                <code className="text-white bg-black/40 px-1 py-0.5 rounded">.env</code> file. Check the setup guide in the documentation to configure your Google Cloud Console OAuth consent screen and redirect URI.
              </p>
            </div>
          )}

          {/* Feature Guarantee Pills */}
          <div className="mt-8 border-t border-white/10 pt-6 space-y-2.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-fg-3">
              Included with your account
            </div>
            <div className="grid grid-cols-1 gap-2 text-xs text-fg-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-3.5 text-[#19D49A] shrink-0" />
                <span>Isolated private signal tracking &amp; 24h verification</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="size-3.5 text-[#2F6BFF] shrink-0" />
                <span>Personalized Walrus Memory vault with Sui audit proofs</span>
              </div>
              <div className="flex items-center gap-2">
                <Radio className="size-3.5 text-[#F5A623] shrink-0" />
                <span>Custom market alerts &amp; historical pattern alerts</span>
              </div>
            </div>
          </div>

          {/* Separation of wallet notice */}
          <p className="mt-6 text-[10px] text-center text-fg-3 leading-relaxed">
            Note: Google sign-in provides account authentication and data isolation. It does not access private keys or automatically create a blockchain wallet.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 mx-auto w-full max-w-5xl text-center pt-6 text-[11px] text-fg-3">
        SignalRecall is an informational market intelligence co-pilot and does not provide financial advice or execute trades.
      </footer>
    </div>
  );
}

export default function SignInPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-[#060913] flex items-center justify-center text-white">
          <div className="size-6 animate-spin rounded-full border-2 border-electric border-t-transparent" />
        </div>
      }
    >
      <SignInContent />
    </React.Suspense>
  );
}
