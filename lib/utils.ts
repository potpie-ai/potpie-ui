import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
