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

if (isFirebaseEnabled()) {
  // Real Firebase config and initialization
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };

  // Initialize Firebase
  firebase_app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  db = getFirestore(firebase_app);
  auth = getAuth(firebase_app);
  
  console.log("Firebase initialized with real implementation");
} else {
  // Mock implementations for local development
  // Create a minimal Firebase app to satisfy type requirements
  firebase_app = getApps().length === 0 ? 
    initializeApp({ apiKey: "fake-key", authDomain: "fake.firebaseapp.com", projectId: "fake-project" }) : 
    getApps()[0];
  
  // Get the real auth instance
  auth = getAuth(firebase_app);
  db = getFirestore(firebase_app);
  
  // Create a mock user
  const mockUser = generateMockUser();
  
  // Set the current user
  // @ts-ignore - We're deliberately overriding for mock purposes
  auth.currentUser = mockUser;
  
  // Store the original functions
  const originalOnIdTokenChanged = auth.onIdTokenChanged;
  const originalOnAuthStateChanged = auth.onAuthStateChanged;
  
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
}

export { firebase_app, auth, db };