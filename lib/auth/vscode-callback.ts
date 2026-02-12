/**
 * Builds the VS Code extension auth callback URL.
 * When customToken is present, the extension can establish a Firebase session
 * for silent token refresh via getIdToken(true).
 */
const VSCODE_CALLBACK_BASE = "http://localhost:54333/auth/callback";

export function buildVSCodeCallbackUrl(
  token: string,
  customToken?: string | null,
): string {
  const params = new URLSearchParams({ token });
  if (customToken) params.set("customToken", customToken);
  return `${VSCODE_CALLBACK_BASE}?${params.toString()}`;
}
