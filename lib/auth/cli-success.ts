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
      body: "Successfully logged in to GitHub. You may return to your CLI.",
    };
  }
  return {
    title: "Logged in to Potpie",
    body: "Successfully logged in. You may return to your CLI.",
  };
}

export function cliSuccessPath(provider: CliAuthProvider): string {
  return `/cli-success?provider=${provider}`;
}
