import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);        // Firebase Auth user
  const [profile, setProfile] = useState(null);  // Firestore user doc
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          // Force-refresh the user object so emailVerified is up to date
          await currentUser.reload();
        } catch (err) {
          console.error('Reload failed:', err);
        }
      }

      // Use auth.currentUser AFTER reload — it's the freshest reference
      const freshUser = auth.currentUser;
      setUser(freshUser);

      if (freshUser) {
        try {
          const snap = await getDoc(doc(db, 'users', freshUser.uid));
          if (snap.exists()) {
            console.log('✅ Profile loaded:', snap.data());
            setProfile(snap.data());
          } else {
            console.warn('⚠️ No profile doc for uid:', freshUser.uid);
            setProfile(null);
          }
        } catch (err) {
          console.error('❌ Profile fetch failed:', err.code, err.message);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = { user, profile, loading };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}