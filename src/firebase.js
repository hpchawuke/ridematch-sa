import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";
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

// ============================================
// AUTH FUNCTIONS
// ============================================

/**
 * Register a new user and send a verification email
 */
export const registerUser = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Send the verification email immediately
    await sendEmailVerification(user);

    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Sign in an existing user
 */
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Log out the current user
 */
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Resend the verification email to the currently signed-in user
 */
export const resendVerificationEmail = async () => {
  try {
    if (!auth.currentUser) {
      return { success: false, error: "No user is signed in." };
    }
    await sendEmailVerification(auth.currentUser);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Reload the current user and check if their email is verified
 */
export const checkEmailVerified = async () => {
  try {
    if (!auth.currentUser) return false;
    await auth.currentUser.reload();
    return auth.currentUser.emailVerified;
  } catch (error) {
    console.error("Error checking verification:", error);
    return false;
  }
};

// Export onAuthStateChanged so components can listen to auth changes
export { onAuthStateChanged };