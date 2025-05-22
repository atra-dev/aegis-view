// Import the functions you need from the SDKs you need
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  initializeFirestore,
  persistentLocalCache
} from "firebase/firestore";
import {
  getAuth,
  browserLocalPersistence,
  setPersistence
} from "firebase/auth";
import { setupCertificatePinning } from "../utils/certificatePinning";
import { logger } from "../utils/logger";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

let app;
let auth;
let firedb;

const initializeFirebase = async () => {
  try {
    if (typeof window !== "undefined") {
      setupCertificatePinning();
    }

    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }

    // Firestore with new persistence settings
    firedb = initializeFirestore(app, {
      localCache: persistentLocalCache()
    });

    // Auth
    auth = getAuth(app);

    if (typeof window !== "undefined") {
      await setPersistence(auth, browserLocalPersistence);

      auth.settings = {
        ...auth.settings,
        appVerificationDisabledForTesting: false
      };

      auth.useDeviceLanguage();
    }

    return { app, auth, firedb };
  } catch (error) {
    logger.error("Firebase initialization error:", error);
    throw error;
  }
};

// Initialize Firebase immediately
const firebaseInstance = initializeFirebase().catch((error) => {
  logger.error("Failed to initialize Firebase:", error);
});

// Export initialized instances
export { app, auth, firedb };
