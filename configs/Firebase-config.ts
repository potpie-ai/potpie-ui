import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { 
  getAuth, 
  Auth, 
  onIdTokenChanged as firebaseOnIdTokenChanged,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signInWithPopup as firebaseSignInWithPopup,
  NextOrObserver,
  User,
  Unsubscribe
} from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { isFirebaseEnabled, generateMockUser } from "@/lib/utils";

// Create a real or mock Firebase app and services
let firebase_app: FirebaseApp | null = null;
let auth: Auth;
let db: Firestore;

// Get Firebase config directly from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Log Firebase config availability (without exposing values)
console.log("Firebase config check:");
Object.entries(firebaseConfig).forEach(([key, value]) => {
  console.log(`- ${key}: ${value ? 'PRESENT' : 'MISSING'}`);
});

// Check if required config is available
const hasRequiredConfig = !!(
  firebaseConfig.apiKey && 
  firebaseConfig.authDomain && 
  firebaseConfig.projectId && 
  firebaseConfig.appId
);

console.log(`Firebase has required config: ${hasRequiredConfig}`);

// Use Firebase if required config is available, otherwise use mock
if (hasRequiredConfig) {
  try {
    // Initialize Firebase with the config
    firebase_app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(firebase_app);
    auth = getAuth(firebase_app);
    
    console.log("Firebase initialized with REAL implementation");
    
    // Set a global flag to indicate we're NOT using mock authentication
    if (typeof window !== 'undefined') {
      console.log("Setting __usingMockFirebase to FALSE");
      (window as any).__usingMockFirebase = false;
    }
    
    // IMPORTANT: Don't set a mock user when using real Firebase
    // This ensures we use the actual Firebase authentication
    
    // Clear any mock user that might have been set
    if (auth.currentUser && auth.currentUser.uid === 'local-dev-user') {
      console.log("Clearing mock user since Firebase is properly configured");
      // @ts-ignore - We're deliberately clearing for proper authentication
      auth.currentUser = null;
    }
    
    // Don't override the auth methods when using real Firebase
    console.log("Using real Firebase authentication methods");
  } catch (error) {
    console.error("Error initializing Firebase:", error);
    // Fall back to mock if initialization fails
    initializeMockFirebase();
  }
} else {
  // No Firebase config, use mock
  console.log("Firebase config missing, using mock implementation");
  initializeMockFirebase();
}

// Function to initialize mock Firebase implementation
function initializeMockFirebase() {
  console.log("Initializing mock Firebase implementation");
  
  // Create a minimal Firebase app to satisfy type requirements
  firebase_app = getApps().length === 0 ? 
    initializeApp({ apiKey: "fake-key", authDomain: "fake.firebaseapp.com", projectId: "fake-project" }) : 
    getApps()[0];
  
  // Get the real auth instance
  auth = getAuth(firebase_app);
  db = getFirestore(firebase_app);
  
  // Create a mock user
  const mockUser = generateMockUser();
  
  // Set a global flag to indicate we're using mock authentication
  if (typeof window !== 'undefined') {
    (window as any).__usingMockFirebase = true;
    console.log("Set __usingMockFirebase to TRUE - API requests will not include Authorization headers");
  }
  
  // Set the current user
  // @ts-ignore - We're deliberately overriding for mock purposes
  auth.currentUser = mockUser;
  
  // Mock signInWithPopup for GitHub authentication
  // @ts-ignore - Adding mock implementation
  auth.signInWithPopup = async (provider) => {
    console.log("Mock signInWithPopup called with provider:", provider);
    return {
      user: mockUser as User,
      providerId: 'github.com',
      operationType: 'signIn',
    };
  };
  
  // Override onIdTokenChanged with mock implementation
  auth.onIdTokenChanged = function(nextOrObserver: NextOrObserver<User | null>): Unsubscribe {
    // Handle different types of parameters
    if (typeof nextOrObserver === 'function') {
      setTimeout(() => {
        nextOrObserver(mockUser as User);
      }, 0);
    } else if (nextOrObserver && typeof nextOrObserver === 'object') {
      // Observer object with next method
      setTimeout(() => {
        if (nextOrObserver.next) {
          nextOrObserver.next(mockUser as User);
        }
      }, 0);
    }
    
    // Return unsubscribe function
    return () => {};
  };
  
  // Override onAuthStateChanged with mock implementation
  auth.onAuthStateChanged = function(nextOrObserver: NextOrObserver<User | null>): Unsubscribe {
    // Handle different types of parameters
    if (typeof nextOrObserver === 'function') {
      setTimeout(() => {
        nextOrObserver(mockUser as User);
      }, 0);
    } else if (nextOrObserver && typeof nextOrObserver === 'object') {
      // Observer object with next method
      setTimeout(() => {
        if (nextOrObserver.next) {
          nextOrObserver.next(mockUser as User);
        }
      }, 0);
    }
    
    // Return unsubscribe function
    return () => {};
  };
  
  console.log("Firebase initialized with mock implementation for local development");
  console.log("API requests will not include Authorization headers when using mock Firebase");
}

export { firebase_app, auth, db };