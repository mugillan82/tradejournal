/**
 * /sign-in page
 *
 * Authentication page for existing TradeJournal users.
 * Wrapped in Suspense so the form can use useSearchParams.
 */

import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { SignInForm } from "@/components/auth/sign-in-form";

function SignInContent() {
  return <SignInForm />;
}

export default function SignInPage() {
  return (
    <AuthLayout>
      <Suspense
        fallback={
          <div
            aria-busy="true"
            aria-label="Loading sign-in form"
            className="flex items-center justify-center py-12"
          >
            <div className="h-6 w-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          </div>
        }
      >
        <SignInContent />
      </Suspense>
    </AuthLayout>
  );
}
