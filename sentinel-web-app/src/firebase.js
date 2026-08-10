/*
 * SentinelMesh — Firebase Configuration
 *
 * Uses environment variables from .env file.
 * Copy .env.example to .env and fill in your values.
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDgOl1hKVgmkuaPEKx41blw5-cwKAS5wE4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "esp32iotproject-e9fe1.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://esp32iotproject-e9fe1-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "esp32iotproject-e9fe1",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "esp32iotproject-e9fe1.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export default app;
