/**
 * Builds the VS Code extension auth callback URL.
 * When customToken is present, the extension can establish a Firebase session
 * for silent token refresh via getIdToken(true).
 *
 * If redirect_uri is provided (e.g. from ?redirect_uri= in the sign-in URL),
 * it is used as the callback base so the extension can use a dynamic port (0).
 * Otherwise falls back to the default localhost:54333.
 *
 * Encoding: token and customToken are added via URLSearchParams so they are
 * percent-encoded. The extension must parse the request URL and read both
 * query params (e.g. URLSearchParams or qs) and use the decoded values.
 * Very long URLs (>2KB) may be truncated by some servers; ensure the callback
 * server allows long query strings if both JWTs are needed.
 */
const VSCODE_CALLBACK_BASE_DEFAULT = "http://localhost:54333/auth/callback";

export function buildVSCodeCallbackUrl(
  token: string,
  customToken?: string | null,
  redirectUri?: string | null,
): string {
  let base = VSCODE_CALLBACK_BASE_DEFAULT;
  if (redirectUri && redirectUri.trim() !== "") {
    try {
      base = decodeURIComponent(redirectUri).replace(/\?.*$/, "");
    } catch {
      base = redirectUri.replace(/\?.*$/, "");
    }
  }
  const params = new URLSearchParams();
  params.set("token", token);
  if (customToken != null && customToken !== "") {
    params.set("customToken", customToken);
  }
  const sep = base.includes("?") ? "&" : "?";
  return `${base}${sep}${params.toString()}`;
}
