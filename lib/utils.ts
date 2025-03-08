import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const list_system_agents = ["codebase_qna_agent","debugging_agent","unit_test_agent","integration_test_agent","LLD_agent","code_changes_agent","code_generation_agent"] // Temp: to be remopved after we get the agents type in list api

// Check if required environment variables are present for a service
export const isServiceEnabled = (serviceEnvVars: string[]): boolean => {
  // Return false if any required env var is missing
  return !serviceEnvVars.some(envVar => 
    process.env[envVar] === undefined || 
    process.env[envVar] === '' || 
    process.env[envVar] === null
  );
};

// Check if Firebase is enabled
export const isFirebaseEnabled = (): boolean => {
  const requiredVars = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID'
  ];
  return isServiceEnabled(requiredVars);
};

// Check if PostHog is enabled
export const isPostHogEnabled = (): boolean => {
  const requiredVars = [
    'NEXT_PUBLIC_POSTHOG_KEY',
    'NEXT_PUBLIC_POSTHOG_HOST'
  ];
  return isServiceEnabled(requiredVars);
};

// Check if Formbricks is enabled
export const isFormbricksEnabled = (): boolean => {
  const requiredVars = [
    'NEXT_PUBLIC_FORMBRICKS_ENVIRONMENT_ID',
    'NEXT_PUBLIC_FORMBRICKS_API_HOST'
  ];
  return isServiceEnabled(requiredVars);
};

// Generate a mock user for development mode
export const generateMockUser = () => {
  return {
    uid: 'local-dev-user',
    email: 'local-dev@example.com',
    displayName: 'Local Dev User',
    emailVerified: true,
    isAnonymous: false,
    metadata: {
      creationTime: '2023-01-01T00:00:00Z',
      lastSignInTime: '2023-01-01T00:00:00Z'
    },
    providerData: [{
      providerId: 'password',
      uid: 'local-dev-user',
      displayName: 'Local Dev User',
      email: 'local-dev@example.com',
      phoneNumber: null,
      photoURL: null
    }],
    refreshToken: 'mock-refresh-token',
    tenantId: null,
    delete: async () => Promise.resolve(),
    getIdToken: async () => 'mock-id-token',
    getIdTokenResult: async () => ({
      token: 'mock-id-token',
      authTime: new Date().toISOString(),
      expirationTime: new Date(Date.now() + 3600000).toISOString(),
      issuedAtTime: new Date().toISOString(),
      signInProvider: 'password',
      signInSecondFactor: null,
      claims: {}
    }),
    reload: async () => Promise.resolve(),
    toJSON: () => ({
      uid: 'local-dev-user',
      email: 'local-dev@example.com',
      displayName: 'Local Dev User',
      emailVerified: true
    })
  };
};
