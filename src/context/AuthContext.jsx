import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // 1. Force-refresh the Firebase user so emailVerified is up to date
      if (currentUser) {
        try {
          await currentUser.reload();
        } catch (err) {
          console.error('Reload failed:', err);
        }
      }

      const freshUser = auth.currentUser;
      setUser(freshUser);

      // 2. Load (or sync) the Firestore profile
      if (freshUser) {
        try {
          const ref = doc(db, 'users', freshUser.uid);
          const snap = await getDoc(ref);

          if (snap.exists()) {
            const data = snap.data();
            setProfile(data);

            // 3. Mirror emailVerified → Firestore.verified (one-way sync)
            if (freshUser.emailVerified === true && data.verified !== true) {
              try {
                await updateDoc(ref, { verified: true });
                setProfile({ ...data, verified: true });
                console.log('✅ Synced verified:true to Firestore');
              } catch (err) {
                console.error('Failed to sync verified flag:', err);
              }
            }
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