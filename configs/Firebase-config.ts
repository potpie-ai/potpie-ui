/**
 * Firebase config - conditionally loads real Firebase or mock.
 * When Firebase env vars are missing, uses mock with NO Firebase SDK imports
 * (skips Firebase initialization entirely for dev mode).
 */
const hasRequiredConfig = !!(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
  process.env.NEXT_PUBLIC_FIREBASE_APP_ID
);

// Conditional load: real config imports Firebase SDK, mock has zero Firebase deps
const { auth, db, firebase_app } = hasRequiredConfig
  ? require("./Firebase-config.real")
  : require("./Firebase-config.mock");

export { auth, db, firebase_app };
