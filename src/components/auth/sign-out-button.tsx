/**
 * Sign-out button
 *
 * Client component used inside the protected /dashboard proof page
 * so the full auth flow can be manually tested.
 *
 * Uses Better Auth's signOut helper — never the server alone — so
 * the cookie is cleared in the browser before the redirect.
 */

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/client";

export function SignOutButton() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const result = await signOut();
      if (result?.error) {
        setError("Could not sign out. Please try again.");
        setSubmitting(false);
        return;
      }
      // After clearing the session cookie, navigate to the sign-in page
      // and force a refresh so the server components re-render with the
      // unauthenticated state.
      router.replace("/sign-in");
      router.refresh();
    } catch {
      setError("Could not sign out. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        type="button"
        variant="secondary"
        size="md"
        onClick={handleSignOut}
        loading={submitting}
        disabled={submitting}
      >
        Sign out
      </Button>
      {error && (
        <p role="alert" className="text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
