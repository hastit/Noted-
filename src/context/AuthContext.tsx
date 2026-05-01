import React, {createContext, useCallback, useContext, useEffect, useMemo, useState} from 'react';
import type {Session, User} from '@supabase/supabase-js';
import {formatAuthErrorMessage} from '../lib/authErrors';
import {isSupabaseConfigured, supabase} from '../lib/supabase';
import {USER_METADATA_FULL_NAME} from '../lib/displayName';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<{error: Error | null}>;
  signUp: (email: string, password: string, fullName: string) => Promise<{error: Error | null}>;
  signInWithGoogle: () => Promise<{error: Error | null}>;
  resetPasswordForEmail: (email: string) => Promise<{error: Error | null}>;
  /** After opening the reset link (recovery session), set a new password. */
  updatePassword: (newPassword: string) => Promise<{error: Error | null}>;
  updateDisplayName: (fullName: string) => Promise<{error: Error | null}>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSession(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    supabase.auth
      .getSession()
      .then(({data: {session: s}}) => {
        if (!cancelled) setSession(s);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const {
      data: {subscription},
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) return {error: new Error('Supabase is not configured')};
    const {error} = await supabase.auth.signInWithPassword({email, password});
    return {error: error ? new Error(formatAuthErrorMessage(error)) : null};
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    if (!isSupabaseConfigured) return {error: new Error('Supabase is not configured')};
    const name = fullName.trim();
    const {error} = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {[USER_METADATA_FULL_NAME]: name},
      },
    });
    return {error: error ? new Error(formatAuthErrorMessage(error)) : null};
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!isSupabaseConfigured) return {error: new Error('Supabase is not configured')};
    if (typeof window === 'undefined') return {error: new Error('Google sign-in is only available in the browser')};
    const {error} = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {redirectTo: `${window.location.origin}/app`},
    });
    return {error: error ? new Error(error.message) : null};
  }, []);

  const resetPasswordForEmail = useCallback(async (email: string) => {
    if (!isSupabaseConfigured) return {error: new Error('Supabase is not configured')};
    const trimmed = email.trim();
    if (!trimmed) return {error: new Error('Enter your email above first.')};
    if (typeof window === 'undefined') return {error: new Error('Password reset is only available in the browser')};
    const {error} = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return {error: error ? new Error(error.message) : null};
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    if (!isSupabaseConfigured) return {error: new Error('Supabase is not configured')};
    const {error} = await supabase.auth.updateUser({password: newPassword});
    return {error: error ? new Error(formatAuthErrorMessage(error)) : null};
  }, []);

  const updateDisplayName = useCallback(async (fullName: string) => {
    const name = fullName.trim();
    if (!name) return {error: new Error('Name is required')};
    const {error} = await supabase.auth.updateUser({
      data: {[USER_METADATA_FULL_NAME]: name},
    });
    return {error: error ? new Error(error.message) : null};
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      configured: isSupabaseConfigured,
      signIn,
      signUp,
      signInWithGoogle,
      resetPasswordForEmail,
      updatePassword,
      updateDisplayName,
      signOut,
    }),
    [session, loading, signIn, signUp, signInWithGoogle, resetPasswordForEmail, updatePassword, updateDisplayName, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}
