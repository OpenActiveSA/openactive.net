'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { getSupabaseClientClient } from './supabase';
import { useRouter } from 'next/navigation';
import { clearAuthTokens, isRefreshTokenError } from './auth-utils';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const mountedRef = useRef(false);

  useEffect(() => {
    // Mark component as mounted
    mountedRef.current = true;
    
    const supabase = getSupabaseClientClient();
    
    // Helper function to safely update state only if component is mounted
    const safeSetState = (updater: () => void) => {
      if (mountedRef.current) {
        updater();
      }
    };
    
    // Get initial session with error handling
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mountedRef.current) return;
      
      if (error) {
        // Handle refresh token errors gracefully
        if (isRefreshTokenError(error)) {
          console.warn('Invalid refresh token detected, clearing session:', error.message);
          // Clear invalid tokens from storage
          clearAuthTokens();
          // Clear invalid session
          supabase.auth.signOut({ scope: 'local' }).catch(() => {
            // Ignore errors when clearing invalid session
          });
          safeSetState(() => {
            setSession(null);
            setUser(null);
            setLoading(false);
          });
        } else {
          console.error('Error getting session:', error);
          safeSetState(() => setLoading(false));
        }
      } else {
        safeSetState(() => {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        });
      }
    }).catch((error) => {
      if (!mountedRef.current) return;
      
      // Handle any unexpected errors
      if (isRefreshTokenError(error)) {
        console.warn('Refresh token error caught, clearing auth state');
        clearAuthTokens();
        safeSetState(() => {
          setSession(null);
          setUser(null);
          setLoading(false);
        });
      } else {
        console.error('Unexpected error getting session:', error);
        safeSetState(() => setLoading(false));
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current) return;
      
      // Handle SIGNED_OUT event (including when token refresh fails)
      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
        console.warn('Session ended, clearing auth state');
        safeSetState(() => {
          setSession(null);
          setUser(null);
          setLoading(false);
        });
      } else {
        safeSetState(() => {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        });
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      const supabase = getSupabaseClientClient();
      // Try to sign out, but clear local state even if it fails
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn('Error signing out (clearing local state anyway):', error);
        // Clear auth tokens manually if signOut fails
        clearAuthTokens();
      }
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Error in signOut:', error);
      // Clear state even if signOut fails
      setUser(null);
      setSession(null);
      // Don't throw - just clear the state
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // Return a default context instead of throwing to prevent crashes
    // This can happen during SSR or if the provider isn't set up yet
    console.warn('useAuth called outside AuthProvider, returning default values');
    return {
      user: null,
      session: null,
      loading: false,
      signOut: async () => {},
    };
  }
  return context;
}

