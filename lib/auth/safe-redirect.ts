/**
 * Helpers for safely handling user-supplied redirect targets in the auth flow.
 *
 * Open-redirect protection (issue potpie-ai/potpie#596): the `redirect` query
 * param on /sign-in (and other auth pages) must only ever send the user to an
 * internal, same-origin path — never to an attacker-controlled absolute URL.
 */

// Decode once, defensively. A malformed sequence falls back to the raw value.
function decodeOnce(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Normalises a user-supplied `redirect` value into a guaranteed-internal path.
 *
 * Accepts only same-origin relative paths (e.g. `/newchat?repo=x#y`). Anything
 * that could navigate off-site — absolute URLs, protocol-relative `//host`,
 * backslash tricks, control characters, non-`/` values — collapses to `fallback`.
 */
export function getSafeInternalPath(
  raw: string | null | undefined,
  fallback = "/",
): string {
  if (!raw) return fallback;

  const value = decodeOnce(raw).trim();

  // Must be a rooted path, not a scheme (`https:`), and not protocol-relative.
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  // Browsers treat backslashes as forward slashes, so `/\evil.com` ==> `//evil.com`.
  if (value.includes("\\")) return fallback;
  // Control characters can smuggle a scheme past naive checks.
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= 0x1f || code === 0x7f) return fallback;
  }

  // Final guard: resolve against a sentinel origin and confirm it stays there.
  try {
    const sentinel = "https://internal.invalid";
    const url = new URL(value, sentinel);
    if (url.origin !== sentinel) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

/**
 * True only for loopback (localhost) http(s) callback URLs.
 *
 * The VS Code extension auth flow legitimately passes a `redirect_uri` pointing
 * at a local callback server (e.g. `http://localhost:54333/auth/callback`). Any
 * non-loopback target must be rejected, otherwise the Firebase token appended to
 * that URL would be exfiltrated to an attacker's domain.
 */
export function isLoopbackCallbackUrl(raw: string | null | undefined): boolean {
  if (!raw) return false;

  try {
    const url = new URL(decodeOnce(raw).trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host === "[::1]"
    );
  } catch {
    return false;
  }
}
