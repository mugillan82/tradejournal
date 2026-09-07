/**
 * /sign-up page
 *
 * Account creation page for TradeJournal.
 * Wrapped in Suspense so the form can use useSearchParams.
 */

import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { SignUpForm } from "@/components/auth/sign-up-form";

function SignUpContent() {
  return <SignUpForm />;
}

export default function SignUpPage() {
  return (
    <AuthLayout>
      <Suspense
        fallback={
          <div
            aria-busy="true"
            aria-label="Loading sign-up form"
            className="flex items-center justify-center py-12"
          >
            <div className="h-6 w-6 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          </div>
        }
      >
        <SignUpContent />
      </Suspense>
    </AuthLayout>
  );
}
