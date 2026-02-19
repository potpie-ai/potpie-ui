import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extract complete JSON objects from a stream buffer (same pattern as ChatService).
 * Used for parsing streaming JSON responses in SpecService and PlanService.
 */
export function extractJsonObjects(input: string): {
  objects: string[];
  remaining: string;
} {
  const objects: string[] = [];
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  let startIndex = -1;

  for (let i = 0; i < input.length; i++) {
    const char = input[i]!;

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === "\\") {
      if (inString) escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === "{") {
      if (depth === 0) startIndex = i;
      depth++;
    } else if (char === "}") {
      if (depth === 0) continue;
      depth--;
      if (depth === 0 && startIndex !== -1) {
        objects.push(input.slice(startIndex, i + 1));
        startIndex = -1;
      }
    }
  }

  const remaining =
    depth > 0 && startIndex !== -1 ? input.slice(startIndex) : "";
  return { objects, remaining };
}

/** Parse SSE (event:/data:) blocks from a stream buffer. */
export function parseSSEBuffer(buffer: string): {
  events: { eventType: string; data: Record<string, unknown> }[];
  remaining: string;
} {
  const events: { eventType: string; data: Record<string, unknown> }[] = [];
  const blocks = buffer.split(/\n\n/);
  const remaining = blocks.pop() ?? "";
  for (const block of blocks) {
    if (!block.trim()) continue;
    let eventType = "message";
    let data: Record<string, unknown> = {};
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) eventType = line.slice(6).trim();
      if (line.startsWith("data:")) {
        const raw = line.slice(5).trim();
        if (raw) {
          try {
            data = JSON.parse(raw) as Record<string, unknown>;
          } catch {
            data = { raw };
          }
        }
      }
    }
    events.push({ eventType, data });
  }
  return { events, remaining };
}

export function isSSEResponse(contentType: string | null): boolean {
  return contentType != null && contentType.toLowerCase().includes("text/event-stream");
}

export const list_system_agents = [
  "codebase_qna_agent",
  "debugging_agent",
  "unit_test_agent",
  "integration_test_agent",
  "LLD_agent",
  "code_changes_agent",
  "code_generation_agent",
]; // Temp: to be remopved after we get the agents type in list api

// Check if required environment variables are present for a service
export const isServiceEnabled = (serviceEnvVars: string[]): boolean => {
  // Return true if ALL required env vars are present (not undefined, empty, or null)
  return serviceEnvVars.every(
    (envVar) =>
      process.env[envVar] !== undefined &&
      process.env[envVar] !== "" &&
      process.env[envVar] !== null
  );
};

// Check if Firebase is enabled
export const isFirebaseEnabled = (): boolean => {
  // In Next.js, environment variables can be accessed in different ways
  // depending on whether code is running server-side or client-side

  // Direct check of each environment variable
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  // Direct check of all required variables
  const allVarsExist = !!(apiKey && authDomain && projectId && appId);

  // Safe check for client-side environment
  if (typeof window !== "undefined") {
    // Try to get cached result if available
    const cachedResult = (window as any).__firebaseEnabled;
    if (cachedResult !== undefined) {
      return cachedResult;
    }

    // Store the result in a global cache to ensure consistency
    (window as any).__firebaseEnabled = allVarsExist;
  }

  return allVarsExist;
};

// Check if PostHog is enabled
export const isPostHogEnabled = (): boolean => {
  const requiredVars = ["NEXT_PUBLIC_POSTHOG_KEY", "NEXT_PUBLIC_POSTHOG_HOST"];
  return isServiceEnabled(requiredVars);
};

// Check if Formbricks is enabled
export const isFormbricksEnabled = (): boolean => {
  const requiredVars = [
    "NEXT_PUBLIC_FORMBRICKS_ENVIRONMENT_ID",
    "NEXT_PUBLIC_FORMBRICKS_API_HOST",
  ];
  return isServiceEnabled(requiredVars);
};

// Check if Multimodal features are enabled
export const isMultimodalEnabled = (): boolean => {
  const enabled = process.env.NEXT_PUBLIC_MULTIMODAL_ENABLED;
  return enabled === 'true' || enabled === '1';
};

// Generate a mock user for development mode
export const generateMockUser = () => {
  // Check if Firebase is enabled
  const firebaseEnabled = isFirebaseEnabled();

  // Check if we're using mock Firebase (set in Firebase-config.ts)
  const usingMockFirebase =
    typeof window !== "undefined" &&
    (window as any).__usingMockFirebase === true;

  return {
    uid: "local-dev-user",
    email: "local-dev@example.com",
    displayName: "Local Dev User",
    emailVerified: true,
    isAnonymous: false,
    metadata: {
      creationTime: "2023-01-01T00:00:00Z",
      lastSignInTime: "2023-01-01T00:00:00Z",
    },
    providerData: [
      {
        providerId: "password",
        uid: "local-dev-user",
        displayName: "Local Dev User",
        email: "local-dev@example.com",
        phoneNumber: null,
        photoURL: null,
      },
    ],
    refreshToken: "mock-refresh-token",
    tenantId: null,
    delete: async () => Promise.resolve(),
    getIdToken: async () => {
      // In development mode, we'll return a mock token that will be recognized as such
      // and will cause the Authorization header to be skipped
      return "mock-token-for-local-development";
    },
    getIdTokenResult: async () => ({
      token: "mock-token-for-local-development",
      authTime: new Date().toISOString(),
      expirationTime: new Date(Date.now() + 3600000).toISOString(),
      issuedAtTime: new Date().toISOString(),
      signInProvider: "password",
      signInSecondFactor: null,
      claims: {},
    }),
    reload: async () => Promise.resolve(),
    toJSON: () => ({
      uid: "local-dev-user",
      email: "local-dev@example.com",
      displayName: "Local Dev User",
      emailVerified: true,
    }),
  };
};

// Timezone-aware date formatting utilities
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);

/**
 * Format a UTC date string to local timezone
 * @param dateString - UTC date string from API
 * @param format - dayjs format string (default: "MMM D, YYYY h:mm A")
 * @returns formatted date string in local timezone
 */
export const formatLocalTime = (
  dateString: string,
  format: string = "MMM D, YYYY h:mm A"
) => {
  if (!dateString) return "Unknown";
  // Parse the UTC date and convert to local timezone
  return dayjs.utc(dateString).local().format(format);
};

/**
 * Format a UTC date string to relative time in local timezone
 * @param dateString - UTC date string from API
 * @returns relative time string (e.g., "2 hours ago")
 */
export const formatRelativeTime = (dateString: string) => {
  if (!dateString) return "Unknown time";
  // Parse the UTC date and convert to local timezone for relative time
  return dayjs.utc(dateString).local().fromNow();
};

/**
 * Format a UTC date string to date only in local timezone
 * @param dateString - UTC date string from API
 * @returns formatted date string (e.g., "Dec 15, 2023")
 */
export const formatLocalDate = (dateString: string) => {
  return formatLocalTime(dateString, "MMM D, YYYY");
};

/**
 * Format a UTC date string to time only in local timezone
 * @param dateString - UTC date string from API
 * @returns formatted time string (e.g., "2:30 PM")
 */
export const formatLocalTimeOnly = (dateString: string) => {
  return formatLocalTime(dateString, "h:mm A");
};

/**
 * Parses API error responses and formats them into user-friendly error messages
 * @param error - The error object from API calls
 * @returns A formatted error message string
 */
export function parseApiError(error: any): string {
  // Handle axios error responses
  if (error?.response?.data) {
    const { data, status } = error.response;

    // Handle 422 validation errors with detailed field information
    if (status === 422 && data?.detail && Array.isArray(data.detail)) {
      const validationErrors = data.detail;

      // Group errors by field type for better readability
      const fieldErrors: { [key: string]: string[] } = {};

      validationErrors.forEach((err: any) => {
        if (err.loc && err.msg) {
          // Extract the field name from the location path
          const fieldPath = err.loc.slice(2); // Skip 'body' and 'nodes'
          const fieldName = fieldPath[fieldPath.length - 1];
          const nodeId = fieldPath[1]; // Get the node ID

          if (!fieldErrors[nodeId]) {
            fieldErrors[nodeId] = [];
          }

          // Create a more readable error message
          const readableField = fieldName
            .replace(/([A-Z])/g, " $1")
            .toLowerCase();
          fieldErrors[nodeId].push(`${readableField} is required`);
        }
      });

      // Format the error message
      const errorMessages = Object.entries(fieldErrors).map(
        ([nodeId, errors]) => {
          const shortNodeId = nodeId.length > 20 ? nodeId.slice(-8) : nodeId;
          return `Node ${shortNodeId}: ${errors.join(", ")}`;
        }
      );

      return `Validation errors:\n${errorMessages.join("\n")}`;
    }

    // Handle other structured error responses
    if (data?.message) {
      return data.message;
    }

    if (data?.error) {
      return data.error;
    }

    if (data?.detail && typeof data.detail === "string") {
      return data.detail;
    }

    // Handle HTTP status codes with generic messages
    switch (status) {
      case 400:
        return "Bad request. Please check your input and try again.";
      case 401:
        return "Unauthorized. Please sign in again.";
      case 403:
        return "Access denied. You don't have permission to perform this action.";
      case 404:
        return "Resource not found. Please check the URL and try again.";
      case 409:
        return "Conflict. This resource already exists or is in use.";
      case 422:
        return "Validation error. Please check your input and try again.";
      case 429:
        return "Too many requests. Please wait a moment and try again.";
      case 500:
        return "Server error. Please try again later.";
      case 502:
        return "Bad gateway. Please try again later.";
      case 503:
        return "Service unavailable. Please try again later.";
      default:
        return `Request failed with status ${status}. Please try again.`;
    }
  }

  // Handle network errors
  if (
    error?.code === "NETWORK_ERROR" ||
    error?.message?.includes("Network Error")
  ) {
    return "Network error. Please check your connection and try again.";
  }

  // Handle timeout errors
  if (error?.code === "ECONNABORTED" || error?.message?.includes("timeout")) {
    return "Request timed out. Please try again.";
  }

  // Handle generic error messages
  if (error?.message) {
    return error.message;
  }

  // Fallback error message
  return "An unexpected error occurred. Please try again.";
}

/**
 * Normalize markdown content for preview to prevent width overflow.
 * - Wraps long unbroken strings (URLs, paths, hashes) by inserting zero-width spaces
 * - Limits extremely long lines
 * @param content - Raw markdown string
 * @param maxLineLength - Maximum unbroken segment length before inserting breaks (default: 80)
 * @returns Normalized markdown string safe for constrained-width preview
 */
/**
 * Get the event payload from stream SSE data. Handles envelope shape and double-encoded data.
 */
export function getStreamEventPayload(data: Record<string, unknown> | undefined): Record<string, unknown> {
  if (data == null) return {};
  const raw = (data as Record<string, unknown>)?.data ?? data;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return (data as Record<string, unknown>) ?? {};
    }
  }
  return (raw as Record<string, unknown>) ?? (data as Record<string, unknown>);
}

/**
 * Shorten raw ToolCallPart repr (e.g. from backend or cached) to "tool_name(args)" only.
 * Strips tool_call_id, provider_details, thought_signature so only tool name and args show.
 */
export function shortenToolCallPartContent(text: string | undefined | null): string {
  if (text == null || typeof text !== "string" || !text) return "";
  let out = text;
  // Remove , tool_call_id='...'
  out = out.replace(/,?\s*tool_call_id\s*=\s*['"][^'"]*['"]/g, "");
  // Remove , provider_details={...} (may contain nested braces and long thought_signature)
  out = out.replace(/,?\s*provider_details\s*=\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, "");
  // Replace ToolCallPart(tool_name='X', args= with X(
  out = out.replace(/ToolCallPart\s*\(\s*tool_name\s*=\s*['"]([^'"]+)['"]\s*,\s*args\s*=/g, "$1(");
  return out;
}

export function normalizeMarkdownForPreview(
  content: string | undefined | null,
  maxLineLength: number = 80
): string {
  if (content == null || typeof content !== "string") return "";
  if (!content) return "";

  // Shorten any raw ToolCallPart repr to tool_name(args) before display
  const shortened = shortenToolCallPartContent(content);
  const toWrap = shortened !== content ? shortened : content;

  // Insert zero-width space (\u200B) into long unbroken segments to allow wrapping
  // This handles long URLs, file paths, hashes, etc.
  return toWrap.replace(
    /(\S{40,})/g,
    (match) => {
      // Insert zero-width space every maxLineLength characters
      let result = "";
      for (let i = 0; i < match.length; i += maxLineLength) {
        if (i > 0) result += "\u200B";
        result += match.slice(i, i + maxLineLength);
      }
      return result;
    }
  );
}

/** Detect if content looks like Markdown (headings, bold, code blocks). */
export function looksLikeMarkdown(text: string): boolean {
  if (!text || text.length > 5000) return false;
  const trimmed = text.trim();
  if (/^#+\s/m.test(trimmed)) return true;
  if (/\*\*[^*]+\*\*|__[^_]+__/.test(trimmed)) return true;
  if (/^```[\s\S]*?```/m.test(trimmed)) return true;
  if (/^\s*[-*+]\s+/m.test(trimmed) && /\n/.test(trimmed)) return true;
  return false;
}

/**
 * Format tool result for display: valid JSON is pretty-printed; otherwise return as-is.
 * Caller should use JSON view for parseable JSON and markdown/plain for the rest.
 */
export function formatToolResultForDisplay(raw: string): {
  kind: "json" | "markdown" | "plain";
  content: string;
} {
  if (raw == null || typeof raw !== "string") return { kind: "plain", content: "" };
  const trimmed = raw.trim();
  if (!trimmed) return { kind: "plain", content: "" };
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    try {
      const parsed = JSON.parse(trimmed);
      return { kind: "json", content: JSON.stringify(parsed, null, 2) };
    } catch {
      // not valid JSON
    }
  }
  if (looksLikeMarkdown(trimmed)) return { kind: "markdown", content: trimmed };
  return { kind: "plain", content: trimmed };
}
