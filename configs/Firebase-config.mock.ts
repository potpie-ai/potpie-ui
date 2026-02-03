/**
 * Mock Firebase config - NO Firebase SDK imports.
 * Used when running in dev mode without Firebase to skip initialization entirely.
 */
import { generateMockUser } from "@/lib/utils";

const mockUser = generateMockUser();

// Minimal types to avoid importing from firebase
type AuthLike = {
  currentUser: typeof mockUser | null;
  signInWithPopup: (provider: unknown) => Promise<{ user: typeof mockUser }>;
  onIdTokenChanged: (cb: (user: typeof mockUser | null) => void) => () => void;
  onAuthStateChanged: (cb: (user: typeof mockUser | null) => void) => () => void;
};

type FirebaseAppLike = {
  name: string;
  options: Record<string, unknown>;
  automaticDataCollectionEnabled: boolean;
};

type FirestoreLike = Record<string, never>;

const auth: AuthLike = {
  currentUser: mockUser,
  signInWithPopup: async () => ({
    user: mockUser,
    providerId: "github.com",
    operationType: "signIn",
  }),
  onIdTokenChanged: (nextOrObserver) => {
    const cb =
      typeof nextOrObserver === "function"
        ? nextOrObserver
        : (nextOrObserver as { next?: (u: typeof mockUser | null) => void })
            ?.next;
    if (cb) setTimeout(() => cb(mockUser), 0);
    return () => {};
  },
  onAuthStateChanged: (nextOrObserver) => {
    const cb =
      typeof nextOrObserver === "function"
        ? nextOrObserver
        : (nextOrObserver as { next?: (u: typeof mockUser | null) => void })
            ?.next;
    if (cb) setTimeout(() => cb(mockUser), 0);
    return () => {};
  },
};

const firebase_app: FirebaseAppLike = {
  name: "[DEFAULT]",
  options: {},
  automaticDataCollectionEnabled: false,
};

const db: FirestoreLike = {};

if (typeof window !== "undefined") {
  (window as any).__usingMockFirebase = true;
}

export { auth, db, firebase_app };
