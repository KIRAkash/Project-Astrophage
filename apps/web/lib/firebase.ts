import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";

const getCleanVal = (val: string | undefined) => {
  if (!val || val === "undefined" || val === '""') return undefined;
  return val.replace(/^["']|["']$/g, '');
};

const firebaseConfig = {
  apiKey: getCleanVal(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: getCleanVal(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: getCleanVal(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: getCleanVal(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: getCleanVal(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
  appId: getCleanVal(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
};

let app: FirebaseApp | undefined = undefined;
let auth: Auth | undefined = undefined;
const googleProvider = new GoogleAuthProvider();

if (firebaseConfig.apiKey) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
  } catch (e) {
    console.warn("Failed to initialize Firebase:", e);
  }
}

export { app, auth, googleProvider };

