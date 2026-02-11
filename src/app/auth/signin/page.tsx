"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function SignInContent() {
  const isE2ETestMode = process.env.NEXT_PUBLIC_E2E_TEST_MODE === "true";
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [email, setEmail] = useState(process.env.NEXT_PUBLIC_E2E_TEST_EMAIL || "e2e@example.com");
  const [password, setPassword] = useState(process.env.NEXT_PUBLIC_E2E_TEST_PASSWORD || "e2e-password");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testSignInError, setTestSignInError] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-blue-700 to-cyan-700 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-2">🤟</div>
          <h1 className="text-3xl font-bold text-gray-900">SignTracker</h1>
          <p className="text-gray-600 mt-3">Sign in securely to track your child&apos;s ASL progress.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-6">
            <p className="text-red-700 text-sm">
              {error === "OAuthAccountNotLinked"
                ? "This email is already linked to another sign-in method."
                : "Sign-in failed. Please try again."}
            </p>
          </div>
        )}

        <button
          data-testid="google-sign-in"
          onClick={() => signIn("google", { callbackUrl })}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-xl px-4 py-3 hover:bg-gray-50 transition"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
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
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span className="text-gray-700 font-medium">Continue with Google</span>
        </button>

        {isE2ETestMode && (
          <form
            className="mt-4 border-t border-gray-200 pt-4 space-y-3"
            onSubmit={async (event) => {
              event.preventDefault();
              setIsSubmitting(true);
              setTestSignInError(null);
              const result = await signIn("credentials", {
                email,
                password,
                callbackUrl,
                redirect: false,
              });

              if (result?.error) {
                setTestSignInError("Invalid E2E credentials");
                setIsSubmitting(false);
                return;
              }

              if (result?.url) {
                window.location.href = result.url;
                return;
              }

              setIsSubmitting(false);
            }}
          >
            <p className="text-xs uppercase tracking-wide text-gray-500">E2E Test Sign-In</p>
            <input
              data-testid="e2e-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
            <input
              data-testid="e2e-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
            <button
              data-testid="e2e-sign-in"
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {isSubmitting ? "Signing in..." : "Sign in for E2E"}
            </button>
            {testSignInError && <p className="text-xs text-red-600">{testSignInError}</p>}
          </form>
        )}
      </div>
    </div>
  );
}

function SignInLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-blue-700 to-cyan-700">
      <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInLoading />}>
      <SignInContent />
    </Suspense>
  );
}
