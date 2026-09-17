/**
 * Google Sign-In Button
 *
 * Client-side button to authenticate with Google OAuth via Better Auth.
 * Styled per TradeJournal dark trading aesthetic.
 */

"use client";

import { useState } from "react";
import { signIn } from "@/lib/auth/client";

interface GoogleSignInButtonProps {
  /** Text displayed on the button, e.g. "Continue with Google" or "Sign up with Google" */
  text?: string;
  /** Safe internal redirect target URL after authentication */
  callbackUrl?: string;
  /** Whether the button is disabled from outside form state */
  disabled?: boolean;
  /** Callback fired when an error occurs during sign-in */
  onError?: (error: string) => void;
}

export function GoogleSignInButton({
  text = "Continue with Google",
  callbackUrl = "/dashboard",
  disabled = false,
  onError,
}: GoogleSignInButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleGoogleSignIn() {
    try {
      setLoading(true);
      const result = await signIn.social({
        provider: "google",
        callbackURL: callbackUrl,
      });

      if (result?.error) {
        onError?.(
          result.error.message ||
            "Could not connect to Google. Please verify your Google OAuth credentials in .env.",
        );
        setLoading(false);
        return;
      }

      if (result?.data?.url) {
        window.location.href = result.data.url;
      }
    } catch {
      onError?.("Could not connect to Google. Please try again.");
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={disabled || loading}
      className="w-full inline-flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-800/90 hover:bg-slate-800 active:bg-slate-900 text-slate-100 font-medium text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed select-none shadow-sm cursor-pointer"
      aria-label={text}
      data-testid="google-signin-button"
    >
      {loading ? (
        <svg
          className="animate-spin h-4 w-4 flex-shrink-0 text-slate-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
      <span>{loading ? "Connecting to Google…" : text}</span>
    </button>
  );
}
