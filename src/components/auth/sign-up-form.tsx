/**
 * Sign-up form
 *
 * Client-side form for creating a new TradeJournal account.
 * Uses Better Auth client (signUp.email) — does not bypass the
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
import { signUp } from "@/lib/auth/client";
import { getSafeRedirectPath } from "@/lib/auth/redirect";

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

interface FieldTouched {
  name: boolean;
  email: boolean;
  password: boolean;
  confirmPassword: boolean;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateForm(values: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}): FormErrors {
  const errors: FormErrors = {};

  if (!values.name.trim()) {
    errors.name = "Name is required.";
  } else if (values.name.trim().length < 2) {
    errors.name = "Name must be at least 2 characters.";
  }

  if (!values.email.trim()) {
    errors.email = "Email is required.";
  } else if (!EMAIL_REGEX.test(values.email.trim())) {
    errors.email = "Please enter a valid email address.";
  }

  if (!values.password) {
    errors.password = "Password is required.";
  } else if (values.password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  } else if (values.password.length > 128) {
    errors.password = "Password is too long.";
  }

  if (!values.confirmPassword) {
    errors.confirmPassword = "Please confirm your password.";
  } else if (values.password !== values.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Resolve a safe internal redirect target (if any)
  const safeRedirect = useMemo(
    () => getSafeRedirectPath(searchParams.get("redirect")),
    [searchParams],
  );

  const [values, setValues] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [touched, setTouched] = useState<FieldTouched>({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
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

    // Reveal all validation errors
    setTouched({
      name: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    if (!isValid || submitting) return;

    setSubmitting(true);
    setFormError(null);

    try {
      const result = await signUp.email({
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
      });

      if (result.error) {
        // Map common Better Auth errors to user-friendly messages.
        const code = (result.error as { code?: string }).code;
        const message = result.error.message ?? "Sign-up failed.";

        const friendly =
          code === "USER_ALREADY_EXISTS"
            ? "An account with that email already exists. Try signing in instead."
            : code === "INVALID_EMAIL"
              ? "Please enter a valid email address."
              : code === "PASSWORD_TOO_SHORT"
                ? "Password is too short. Use at least 8 characters."
                : message;

        setFormError(friendly);
        setSubmitting(false);
        return;
      }

      // Successful sign-up. Better Auth auto-signs-in by config.
      // Use replace so back-button doesn't return to the form.
      router.replace(safeRedirect ?? "/dashboard");
      router.refresh();
    } catch {
      // Never expose raw error contents to the user.
      setFormError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-7">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
          Create your account
        </h1>
        <p className="text-sm text-slate-400">
          Start journaling your trades in minutes.
        </p>
      </div>

      {formError && (
        <Alert variant="error" data-testid="signup-form-error">
          {formError}
        </Alert>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
        noValidate
        aria-label="Sign up form"
      >
        <Input
          label="Name"
          name="name"
          type="text"
          autoComplete="name"
          required
          placeholder="Your name"
          value={values.name}
          onChange={(e) => updateValue("name", e.target.value)}
          onBlur={() => handleBlur("name")}
          error={showError("name")}
          disabled={submitting}
        />

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
          required
          placeholder="At least 8 characters"
          value={values.password}
          onChange={(e) => updateValue("password", e.target.value)}
          onBlur={() => handleBlur("password")}
          error={showError("password")}
          disabled={submitting}
          hint="Use 8+ characters with a mix of letters, numbers, and symbols."
        />

        <PasswordInput
          label="Confirm password"
          name="confirmPassword"
          autoComplete="new-password"
          required
          placeholder="Re-enter your password"
          value={values.confirmPassword}
          onChange={(e) => updateValue("confirmPassword", e.target.value)}
          onBlur={() => handleBlur("confirmPassword")}
          error={showError("confirmPassword")}
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
          {submitting ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="text-center text-sm text-slate-400">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="font-medium text-emerald-400 hover:text-emerald-300 transition-colors duration-150"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
