/**
 * Sign-in form
 *
 * Client-side form for authenticating existing TradeJournal users.
 * Uses Better Auth client (signIn.email) — does not bypass the
 * existing auth API.
 */

"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { signIn } from "@/lib/auth/client";
import { getSafeRedirectPath } from "@/lib/auth/redirect";

interface FormErrors {
  email?: string;
  password?: string;
}

interface FieldTouched {
  email: boolean;
  password: boolean;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateForm(values: {
  email: string;
  password: string;
}): FormErrors {
  const errors: FormErrors = {};

  if (!values.email.trim()) {
    errors.email = "Email is required.";
  } else if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = "Please enter a valid email address.";
  }

  if (!values.password) {
    errors.password = "Password is required.";
  }

  return errors;
}

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const safeRedirect = useMemo(
    () => getSafeRedirectPath(searchParams.get("redirect")),
    [searchParams],
  );

  const [values, setValues] = useState({
    email: "",
    password: "",
  });
  const [touched, setTouched] = useState<FieldTouched>({
    email: false,
    password: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const errors = useMemo(() => validateForm(values), [values]);
  const isValid = Object.keys(errors).length === 0;

  function showError(field: keyof FormErrors): string | undefined {
    return touched[field] ? errors[field] : undefined;
  }

  function handleBlur(field: keyof FieldTouched) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  function updateValue<K extends keyof typeof values>(
    field: K,
    value: string,
  ) {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (formError) setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setTouched({ email: true, password: true });

    if (!isValid || submitting) return;

    setSubmitting(true);
    setFormError(null);

    try {
      const result = await signIn.email({
        email: values.email.trim(),
        password: values.password,
      });

      if (result.error) {
        const code = (result.error as { code?: string }).code;

        // For credentials, we deliberately show a single non-leaking message
        // so attackers cannot enumerate which emails are registered.
        const invalidCreds = [
          "INVALID_EMAIL_OR_PASSWORD",
          "INVALID_CREDENTIALS",
          "INVALID_EMAIL",
          "USER_NOT_FOUND",
          "INVALID_PASSWORD",
        ];

        const friendly = invalidCreds.includes(code ?? "")
          ? "Invalid email or password."
          : code === "EMAIL_NOT_VERIFIED"
            ? "Please verify your email before signing in."
            : "Could not sign you in. Please try again.";

        setFormError(friendly);
        setSubmitting(false);
        return;
      }

      router.replace(safeRedirect ?? "/dashboard");
      router.refresh();
    } catch {
      setFormError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-7">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
          Welcome back
        </h1>
        <p className="text-sm text-slate-400">
          Sign in to your TradeJournal account.
        </p>
      </div>

      {formError && (
        <Alert variant="error" data-testid="signin-form-error">
          {formError}
        </Alert>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
        noValidate
        aria-label="Sign in form"
      >
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder="you@example.com"
          value={values.email}
          onChange={(e) => updateValue("email", e.target.value)}
          onBlur={() => handleBlur("email")}
          error={showError("email")}
          disabled={submitting}
        />

        <PasswordInput
          label="Password"
          name="password"
          autoComplete="current-password"
          required
          placeholder="Your password"
          value={values.password}
          onChange={(e) => updateValue("password", e.target.value)}
          onBlur={() => handleBlur("password")}
          error={showError("password")}
          disabled={submitting}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={submitting}
          disabled={submitting}
          className="w-full"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="text-center text-sm text-slate-400">
        Don&apos;t have an account?{" "}
        <Link
          href="/sign-up"
          className="font-medium text-emerald-400 hover:text-emerald-300 transition-colors duration-150"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
