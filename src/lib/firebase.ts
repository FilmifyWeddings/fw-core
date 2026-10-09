'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Checks whether Google Firebase environment variables are provided.
 */
export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
};

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;

/**
 * Safely initializes and returns Firebase Auth on the browser.
 */
export const getFirebaseAuth = (): Auth | null => {
  if (typeof window === 'undefined') return null;
  if (!isFirebaseConfigured()) return null;

  try {
    if (!cachedApp) {
      cachedApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    }
    if (!cachedAuth && cachedApp) {
      cachedAuth = getAuth(cachedApp);
    }
    return cachedAuth;
  } catch (err) {
    console.warn('[Firebase Auth Init Failed]:', err);
    return null;
  }
};
