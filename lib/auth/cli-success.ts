/**
 * CLI auth success page helpers (no Firebase dependency).
 */

export type CliAuthProvider = "potpie" | "github";

export function normalizeCliAuthProvider(
  raw: string | null | undefined,
): CliAuthProvider {
  const value = (raw || "potpie").trim().toLowerCase();
  return value === "github" ? "github" : "potpie";
}

export function cliSuccessCopy(provider: CliAuthProvider): {
  title: string;
  body: string;
} {
  if (provider === "github") {
    return {
      title: "GitHub connected",
      body: "Successfully connected GitHub for Potpie CLI. You can close this window and return to your terminal.",
    };
  }
  return {
    title: "You're all set",
    body: "Successfully signed in to Potpie CLI. You can close this window and return to your terminal.",
  };
}

export function cliSuccessPath(provider: CliAuthProvider): string {
  return `/cli-success?provider=${provider}`;
}
