import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDXR5TuUlLUlUIGVuoYSfbfLEt-iwEPX88",
  authDomain: "ridematch-sa.firebaseapp.com",
  projectId: "ridematch-sa",
  storageBucket: "ridematch-sa.firebasestorage.app",
  messagingSenderId: "674110146905",
  appId: "1:674110146905:web:590d159dd2c739f6cee448",
  measurementId: "G-5LNJJ6W507"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);