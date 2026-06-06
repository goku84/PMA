import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
const firebaseConfig = {
  apiKey: "AIzaSyCZAlqP6Z7McbeEMILUhH4rXBxAeH2mFzM",
  authDomain: "fieldemp-b7968.firebaseapp.com",
  projectId: "fieldemp-b7968",
  storageBucket: "fieldemp-b7968.firebasestorage.app",
  messagingSenderId: "482257106646",
  appId: "1:482257106646:web:c92bd87b5d7c02bc2e7b77"
};

// Initialize Firebase only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
