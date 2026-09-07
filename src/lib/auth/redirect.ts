/**
 * Safe redirect target validation
 *
 * Rejects open-redirect attempts by allowing only internal relative
 * application paths. Used for ?redirect=... handling on auth pages.
 */

/**
 * Returns a safe internal redirect path or null if the input is unsafe.
 *
 * Accepts:
 *   - Path starting with "/" (relative URL)
 *   - No protocol, no host, no // prefix
 *   - No embedded credentials
 *   - No javascript:/data:/vbscript: schemes (even obfuscated)
 *   - Reasonable length cap
 *
 * Rejects:
 *   - Absolute URLs (http://, https://, etc.)
 *   - Protocol-relative URLs (//evil.com)
 *   - Any value containing a colon followed by a slash
 *   - null/undefined/empty values
 */
export function getSafeRedirectPath(input: string | null | undefined): string | null {
  if (!input) return null;
  if (typeof input !== "string") return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  // Reject overly long values
  if (trimmed.length > 2048) return null;

  // Must start with "/"
  if (!trimmed.startsWith("/")) return null;

  // Reject protocol-relative URLs ("//example.com")
  if (trimmed.startsWith("//")) return null;

  // Reject any scheme (e.g., "/\\example.com", "/javascript:...")
  if (trimmed.includes(":")) return null;

  // Reject backslash variants (some browsers normalize these)
  if (trimmed.includes("\\")) return null;

  // Reject embedded "javascript" or other dangerous strings (defense-in-depth)
  const lowered = trimmed.toLowerCase();
  if (
    lowered.includes("javascript:") ||
    lowered.includes("data:") ||
    lowered.includes("vbscript:") ||
    lowered.includes("%2f%2f") || // encoded "//"
    lowered.includes("%5c") || // encoded "\"
    lowered.includes("http") ||
    lowered.includes("https")
  ) {
    return null;
  }

  return trimmed;
}
