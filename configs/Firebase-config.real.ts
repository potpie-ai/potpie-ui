/**
 * Real Firebase initialization - only loaded when Firebase config is present.
 * This file imports the Firebase SDK.
 */
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const firebase_app: FirebaseApp =
  getApps().length === 0
    ? initializeApp(firebaseConfig)
    : (getApps()[0] as FirebaseApp);

const db = getFirestore(firebase_app);
const auth = getAuth(firebase_app);

if (typeof window !== "undefined") {
  (window as any).__usingMockFirebase = false;
}

// Clear any mock user that might have been set
if (auth.currentUser && auth.currentUser.uid === "local-dev-user") {
  // @ts-ignore - clearing for proper authentication
  auth.currentUser = null;
}

export { firebase_app, auth, db };
