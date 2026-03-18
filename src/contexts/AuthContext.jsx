import { useEffect, useMemo, useState } from 'react';
import {
  getCurrentAuthSession,
  isSupabaseConfigured,
  signOutCurrentUser,
  subscribeToAuthChanges,
  syncGoogleProfile,
  getUserProfile,
} from '../services/auth';
import { AuthContext } from './auth-context';

const SENSITIVE_AUTH_PARAMS = [
  'access_token',
  'refresh_token',
  'expires_at',
  'expires_in',
  'token_type',
  'provider_token',
  'provider_refresh_token',
  'code',
];

function hasOAuthCallbackParamsInUrl() {
  if (typeof window === 'undefined') return false;

  const url = new URL(window.location.href);
  const hasSensitiveQuery = SENSITIVE_AUTH_PARAMS.some((param) => url.searchParams.has(param));
  if (hasSensitiveQuery) return true;

  const rawHash = String(url.hash ?? '').replace(/^#/, '');
  if (!rawHash) return false;

  const hashParams = new URLSearchParams(rawHash);
  return SENSITIVE_AUTH_PARAMS.some((param) => hashParams.has(param));
}

function stripSensitiveAuthParamsFromUrl() {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  let changed = false;

  SENSITIVE_AUTH_PARAMS.forEach((param) => {
    if (url.searchParams.has(param)) {
      url.searchParams.delete(param);
      changed = true;
    }
  });

  const rawHash = String(url.hash ?? '').replace(/^#/, '');
  if (rawHash) {
    const hashParams = new URLSearchParams(rawHash);
    SENSITIVE_AUTH_PARAMS.forEach((param) => {
      if (hashParams.has(param)) {
        hashParams.delete(param);
        changed = true;
      }
    });

    const nextHash = hashParams.toString();
    url.hash = nextHash ? `#${nextHash}` : '';
  }

  if (!changed) return;

  const sanitizedUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, document.title, sanitizedUrl);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const isOAuthCallbackFlow = hasOAuthCallbackParamsInUrl();
    let oauthFallbackTimerId = null;

    if (isOAuthCallbackFlow) {
      // Avoid flashing public routes while Supabase exchanges OAuth callback params.
      oauthFallbackTimerId = window.setTimeout(() => {
        if (!isMounted) return;
        setIsLoading(false);
      }, 4500);
    }

    async function loadUserProfile(userId) {
      const profile = await getUserProfile(userId);
      if (isMounted && profile?.full_name) {
        const firstName = profile.full_name.split(' ')[0];
        setUserName(firstName);
      }
    }

    async function bootstrapAuth() {
      if (!isSupabaseConfigured) {
        if (isMounted) {
          setUser(null);
          setUserName('');
          setIsLoading(false);
        }
        return;
      }

      const session = await getCurrentAuthSession();
      if (!isMounted) return;

      setUser(session?.user ?? null);

      if (session?.user?.id) {
        // Sincroniza o perfil com dados do Google if applicable
        await syncGoogleProfile();
        // Depois carrega o perfil salvo
        await loadUserProfile(session.user.id);
      }

      if (session || !isOAuthCallbackFlow) {
        setIsLoading(false);
      }
      stripSensitiveAuthParamsFromUrl();
    }

    bootstrapAuth();

    const unsubscribe = subscribeToAuthChanges((session) => {
      if (!isMounted) return;
      setUser(session?.user ?? null);

      if (session?.user?.id) {
        // Sincroniza o perfil com dados do Google if applicable
        syncGoogleProfile();
        // Depois carrega o perfil salvo
        loadUserProfile(session.user.id);
      } else {
        setUserName('');
      }

      setIsLoading(false);
      if (session) {
        stripSensitiveAuthParamsFromUrl();
      }
    });

    return () => {
      isMounted = false;
      if (oauthFallbackTimerId) {
        window.clearTimeout(oauthFallbackTimerId);
      }
      unsubscribe();
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      userName,
      isAuthenticated: Boolean(user),
      isLoading,
      isSupabaseConfigured,
      signOut: signOutCurrentUser,
      syncGoogleProfile,
    }),
    [isLoading, user, userName]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
