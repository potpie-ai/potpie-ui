const { defineConfig } = require("cypress");
const cypressFirebasePlugin = require('cypress-firebase').plugin;
const admin = require('firebase-admin');
const dotenv = require('dotenv');
dotenv.config();
module.exports = defineConfig({
  env: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    testUid: process.env.TEST_UID,
  },
  e2e: {
    baseUrl: process.env.BASE_URL,
    setupNodeEvents(on: any, config: any) {
      return cypressFirebasePlugin(on, config, admin, {
        projectId: process.env.PROJECT_ID,
      });
    },
  },
});