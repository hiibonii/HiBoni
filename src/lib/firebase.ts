import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// App Check: proves requests to Firestore/Auth are coming from this actual
// app, not a script that just copied the config values above (which are
// not secret — see note in README/docs). Only runs in the browser (App
// Check's reCAPTCHA provider needs `window`) and only if a site key is
// configured, so local dev / builds never break if it's not set up yet.
// Set NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY after registering the app at
// https://console.firebase.google.com/project/_/appcheck
if (typeof window !== "undefined") {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY;
  if (siteKey) {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } else if (process.env.NODE_ENV === "production") {
    // Loud but non-fatal: don't block the app, just make sure this isn't
    // silently forgotten in a production deploy.
    console.warn(
      "[HiBoni] NEXT_PUBLIC_RECAPTCHA_V3_SITE_KEY is not set — Firebase App Check is inactive in production."
    );
  }
}

export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;