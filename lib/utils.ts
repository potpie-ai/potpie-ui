import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const list_system_agents = ["codebase_qna_agent","debugging_agent","unit_test_agent","integration_test_agent","LLD_agent","code_changes_agent","code_generation_agent"] // Temp: to be remopved after we get the agents type in list api

// Check if required environment variables are present for a service
export const isServiceEnabled = (serviceEnvVars: string[]): boolean => {
  // Return true if ALL required env vars are present (not undefined, empty, or null)
  return serviceEnvVars.every(envVar => 
    process.env[envVar] !== undefined && 
    process.env[envVar] !== '' && 
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
  if (typeof window !== 'undefined') {
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
  // Check if Firebase is enabled
  const firebaseEnabled = isFirebaseEnabled();
  
  // Check if we're using mock Firebase (set in Firebase-config.ts)
  const usingMockFirebase = typeof window !== 'undefined' && (window as any).__usingMockFirebase === true;
  
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
    getIdToken: async () => {
      // In development mode, we'll return a mock token that will be recognized as such
      // and will cause the Authorization header to be skipped
      return 'mock-token-for-local-development';
    },
    getIdTokenResult: async () => ({
      token: 'mock-token-for-local-development',
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
