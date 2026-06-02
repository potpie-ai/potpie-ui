import { auth } from "@/configs/Firebase-config";
import { isValidCliCallbackUrl } from "@/lib/auth/cli-callback-url";

export { isValidCliCallbackUrl };

export class CliAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliAuthError";
  }
}

const inFlightCliAuthRuns = new Map<string, Promise<string>>();
const completedCliAuthRuns = new Map<string, string>();

/**
 * Exchange the browser Firebase session for a Firebase custom token and POST it
 * to the CLI callback with the public Firebase Web API key needed for REST
 * exchange. The Firebase ID token only travels to the Potpie backend.
 */
export async function completeCliAuthentication(
  cliCallback: string,
): Promise<string> {
  if (!isValidCliCallbackUrl(cliCallback)) {
    throw new CliAuthError("Invalid CLI callback URL.");
  }
  const state = getCliAuthStateFromUrl();
  if (!state) {
    throw new CliAuthError("Missing CLI auth state.");
  }
  const runKey = buildCliAuthRunKey(cliCallback, state);
  const completedToken = completedCliAuthRuns.get(runKey);
  if (completedToken) {
    return completedToken;
  }
  const existingRun = inFlightCliAuthRuns.get(runKey);
  if (existingRun) {
    return existingRun;
  }

  const run = (async (): Promise<string> => {
    const user = auth.currentUser;
    if (!user) {
      throw new CliAuthError("Not signed in. Please sign in and try again.");
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!baseUrl?.trim()) {
      throw new CliAuthError("API URL is not configured.");
    }

    const firebaseIdToken = await user.getIdToken();
    if (!firebaseIdToken) {
      throw new CliAuthError("Failed to obtain Firebase ID token.");
    }
    const firebaseApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!firebaseApiKey?.trim()) {
      throw new CliAuthError("Firebase API key is not configured.");
    }

    const createResponse = await fetch(`${baseUrl}/api/v1/auth/custom-token`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firebaseIdToken}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });

    if (!createResponse.ok) {
      let detail = "Failed to create CLI session token.";
      try {
        const body = await createResponse.json();
        detail = body?.detail || body?.error || body?.message || detail;
      } catch {
        /* ignore parse errors */
      }
      throw new CliAuthError(detail);
    }

    const payload = (await createResponse.json()) as { customToken?: string };
    const customToken = payload.customToken?.trim();
    if (!customToken || customToken.split(".").length !== 3) {
      throw new CliAuthError("Invalid custom token returned from server.");
    }

    const callbackResponse = await fetch(cliCallback.trim(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        custom_token: customToken,
        firebase_api_key: firebaseApiKey.trim(),
        state,
      }),
    });

    if (!callbackResponse.ok) {
      throw new CliAuthError(
        "Failed to send session token to the CLI. Ensure the CLI is waiting for authentication.",
      );
    }

    completedCliAuthRuns.set(runKey, customToken);
    return customToken;
  })().finally(() => {
    inFlightCliAuthRuns.delete(runKey);
  });

  inFlightCliAuthRuns.set(runKey, run);
  return run;
}

function getCliAuthStateFromUrl(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return new URLSearchParams(window.location.search).get("state")?.trim() || "";
}

function buildCliAuthRunKey(cliCallback: string, state: string): string {
  return `${cliCallback.trim()}::${state}`;
}
