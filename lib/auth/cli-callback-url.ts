/**
 * CLI auth callback URL validation (no Firebase dependency).
 */
export function isValidCliCallbackUrl(raw: string | null | undefined): boolean {
  if (!raw?.trim()) {
    return false;
  }
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "http:") {
      return false;
    }
    if (url.hostname !== "localhost") {
      return false;
    }
    if (url.username || url.password) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
