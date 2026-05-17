'use client';

import type { AuthError, Session, User } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState } from 'react';

import { clearServerSession, persistServerSession } from '@/lib/client-auth';
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase';

type AuthContextValue = {
  isConfigured: boolean;
  isLoading: boolean;
  session: Session | null;
  user: User | null;
  signOut: () => Promise<AuthError | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<ReturnType<typeof getSupabaseBrowserClient>>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [cookieUser, setCookieUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured());

  useEffect(() => {
    let isActive = true;
    let unsubscribe: (() => void) | undefined;
    let loadingFallback: number | undefined;

    async function initializeAuth() {
      try {
        const nextClient = getSupabaseBrowserClient();
        if (!isActive) {
          return;
        }

        setClient(nextClient);

        if (!nextClient) {
          setIsLoading(false);
          return;
        }

        loadingFallback = window.setTimeout(() => {
          if (!isActive) {
            return;
          }

          setIsLoading(false);
        }, 2500);

        const {
          data: { subscription },
        } = nextClient.auth.onAuthStateChange((event, nextSession) => {
          if (!isActive) {
            return;
          }

          if (loadingFallback) {
            window.clearTimeout(loadingFallback);
          }

          setSession(nextSession);
          setCookieUser(nextSession?.user ?? null);
          setIsLoading(false);

          if (nextSession) {
            void persistServerSession(nextSession).catch(() => {});
          } else if (event === 'SIGNED_OUT') {
            void clearServerSession().catch(() => {});
          }
        });

        unsubscribe = () => subscription.unsubscribe();

        const { data, error } = await nextClient.auth.getSession();
        if (!isActive) {
          if (loadingFallback) {
            window.clearTimeout(loadingFallback);
          }
          return;
        }

        if (loadingFallback) {
          window.clearTimeout(loadingFallback);
        }
        const nextSession = error ? null : data.session ?? null;
        setSession(nextSession);
        setCookieUser(nextSession?.user ?? null);

        if (nextSession) {
          void persistServerSession(nextSession).catch(() => {});
        } else {
          const response = await fetch('/api/auth/session', {
            method: 'GET',
            credentials: 'same-origin',
            cache: 'no-store',
          });
          const payload = (await response.json()) as { user?: User | null };

          if (isActive) {
            setCookieUser(payload.user ?? null);
          }
        }
        setIsLoading(false);
      } catch {
        if (!isActive) {
          return;
        }

        setClient(null);
        setSession(null);
        setCookieUser(null);
        setIsLoading(false);
      }
    }

    void initializeAuth();

    return () => {
      isActive = false;
      if (loadingFallback) {
        window.clearTimeout(loadingFallback);
      }
      unsubscribe?.();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isConfigured: isSupabaseConfigured(),
        isLoading,
        session,
        user: session?.user ?? cookieUser ?? null,
        async signOut() {
          let authError: AuthError | null = null;

          if (client) {
            const { error } = await client.auth.signOut();
            authError = error;
          }

          await clearServerSession();
          setSession(null);
          setCookieUser(null);

          return authError;
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
