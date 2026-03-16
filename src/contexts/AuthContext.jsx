import { useEffect, useMemo, useState } from 'react';
import {
  getCurrentAuthSession,
  isSupabaseConfigured,
  signOutCurrentUser,
  subscribeToAuthChanges,
} from '../services/auth';
import { AuthContext } from './auth-context';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapAuth() {
      if (!isSupabaseConfigured) {
        if (isMounted) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      const session = await getCurrentAuthSession();
      if (!isMounted) return;

      setUser(session?.user ?? null);
      setIsLoading(false);
    }

    bootstrapAuth();

    const unsubscribe = subscribeToAuthChanges((session) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      isSupabaseConfigured,
      signOut: signOutCurrentUser,
    }),
    [isLoading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
