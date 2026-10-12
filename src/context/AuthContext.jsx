import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (currentUser) => {
    if (!currentUser) {
      setProfile(null);
      return;
    }

    try {
      // Your own full profile (phone and email included) comes from
      // get_my_profile(); other people's phone numbers are no longer readable.
      // Falls back to a plain read if that function isn't installed yet.
      let data = null;
      let error = null;
      const rpc = await supabase.rpc('get_my_profile');
      if (!rpc.error) {
        data = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
      } else {
        const res = await supabase
          .from('users')
          .select('*')
          .eq('id', currentUser.id)
          .single();
        data = res.data;
        error = res.error;
      }

      if (error) {
        console.error('❌ Profile fetch failed:', error.message);
        setProfile(null);
        return;
      }

      if (!data) {
        console.warn('⚠️ No profile row for id:', currentUser.id);
        setProfile(null);
        return;
      }

      setProfile(data);

      // Note: syncing emailVerified → verified used to happen here on the
      // client. That's now handled server-side by the on_auth_user_verified
      // trigger the moment Supabase confirms the user's email, so there's
      // nothing to mirror manually anymore.
    } catch (err) {
      console.error('❌ Profile fetch failed:', err.message);
      setProfile(null);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // 1. Get the current session on first load
    supabase.auth.getUser().then(async ({ data }) => {
      if (!isMounted) return;
      const currentUser = data.user ?? null;
      setUser(currentUser);
      await loadProfile(currentUser);
      setLoading(false);
    });

    // 2. Subscribe to future auth changes (login, logout, token refresh,
    //    and — importantly — the session Supabase creates once the user
    //    clicks the email verification link)
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return;
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        await loadProfile(currentUser);
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = { user, profile, loading, refreshProfile: () => loadProfile(user) };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
