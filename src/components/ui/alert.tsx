/**
 * Alert component
 *
 * Displays inline feedback messages (errors, warnings, info).
 * Used for server-side and global form-level error messages.
 */

import { type ReactNode } from "react";

interface AlertProps {
  variant?: "error" | "warning" | "info" | "success";
  children: ReactNode;
  className?: string;
}

function Alert({ variant = "error", children, className = "" }: AlertProps) {
  const styles = {
    error:
      "bg-red-950/50 border-red-800/50 text-red-300 [&>svg]:text-red-400",
    warning:
      "bg-amber-950/50 border-amber-800/50 text-amber-200 [&>svg]:text-amber-400",
    info: "bg-blue-950/50 border-blue-800/50 text-blue-200 [&>svg]:text-blue-400",
    success:
      "bg-emerald-950/50 border-emerald-800/50 text-emerald-200 [&>svg]:text-emerald-400",
  };

  return (
    <div
      role="alert"
      className={[
        "flex gap-3 rounded-lg border px-4 py-3 text-sm leading-relaxed",
        styles[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="flex-shrink-0 mt-0.5" aria-hidden="true">
        {variant === "error" && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        )}
        {variant === "warning" && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        )}
        {variant === "info" && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        )}
        {variant === "success" && (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        )}
      </span>
      <span>{children}</span>
    </div>
  );
}

export { Alert };
