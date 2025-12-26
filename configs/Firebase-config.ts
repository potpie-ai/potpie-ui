import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { 
  getAuth, 
  Auth, 
  onIdTokenChanged as firebaseOnIdTokenChanged,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signInWithPopup as firebaseSignInWithPopup,
  setPersistence,
  browserLocalPersistence,
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

// Check if required config is available
const hasRequiredConfig = !!(
  firebaseConfig.apiKey && 
  firebaseConfig.authDomain && 
  firebaseConfig.projectId && 
  firebaseConfig.appId
);

// Use Firebase if required config is available, otherwise use mock
if (hasRequiredConfig) {
  try {
    // Initialize Firebase with the config
    firebase_app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(firebase_app);
    auth = getAuth(firebase_app);
    
    // Set persistence to LOCAL (uses IndexedDB) instead of SESSION (sessionStorage)
    // This is crucial for production environments with storage partitioning (Safari, privacy-focused browsers)
    // IndexedDB is more reliable than sessionStorage in cross-origin/privacy-protected contexts
    if (typeof window !== 'undefined') {
      setPersistence(auth, browserLocalPersistence).catch((error) => {
        console.error("Error setting Firebase persistence:", error);
      });
    }
    
    // Set a global flag to indicate we're NOT using mock authentication
    if (typeof window !== 'undefined') {
      (window as any).__usingMockFirebase = false;
    }
    
    // IMPORTANT: Don't set a mock user when using real Firebase
    // This ensures we use the actual Firebase authentication
    
    // Clear any mock user that might have been set
    if (auth.currentUser && auth.currentUser.uid === 'local-dev-user') {
      // @ts-ignore - We're deliberately clearing for proper authentication
      auth.currentUser = null;
    }
  } catch (error) {
    console.error("Error initializing Firebase:", error);
    // Fall back to mock if initialization fails
    initializeMockFirebase();
  }
} else {
  // No Firebase config, use mock
  initializeMockFirebase();
}

// Function to initialize mock Firebase implementation
function initializeMockFirebase() {
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
  }
  
  // Set the current user
  // @ts-ignore - We're deliberately overriding for mock purposes
  auth.currentUser = mockUser;
  
  // Mock signInWithPopup for GitHub authentication
  // @ts-ignore - Adding mock implementation
  auth.signInWithPopup = async (provider) => {
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
}

export { firebase_app, auth, db };