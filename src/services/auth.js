import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const SUPABASE_ANON_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

export function getSupabaseClient() {
  return supabase;
}

function normalizeAuthErrorMessage(message) {
  const raw = String(message ?? '').trim().toLowerCase();

  if (raw.includes('invalid login credentials')) {
    return 'Email ou senha invalidos.';
  }

  if (raw.includes('email not confirmed')) {
    return 'Confirme seu email antes de entrar.';
  }

  return 'Nao foi possivel autenticar agora. Tente novamente.';
}

export async function signInWithEmailPassword({ email, password }) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase nao configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
  }

  const normalizedEmail = String(email ?? '').trim();
  const normalizedPassword = String(password ?? '');

  if (!normalizedEmail || !normalizedPassword) {
    throw new Error('Informe email e senha para entrar.');
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password: normalizedPassword,
  });

  if (error) {
    throw new Error(normalizeAuthErrorMessage(error.message));
  }

  return true;
}

export async function signUpWithEmailPassword({ email, password }) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase nao configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
  }

  const normalizedEmail = String(email ?? '').trim();
  const normalizedPassword = String(password ?? '');

  if (!normalizedEmail || !normalizedPassword) {
    throw new Error('Informe email e senha para cadastrar.');
  }

  if (normalizedPassword.length < 6) {
    throw new Error('A senha precisa ter pelo menos 6 caracteres.');
  }

  const { error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password: normalizedPassword,
  });

  if (error) {
    const raw = String(error.message ?? '').toLowerCase();
    if (raw.includes('already registered') || raw.includes('already been registered')) {
      throw new Error('Este email ja esta cadastrado. Tente entrar.');
    }
    throw new Error('Nao foi possivel criar sua conta agora. Tente novamente.');
  }

  return true;
}

export async function signInWithGoogle() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase nao configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.');
  }

  const redirectTo = `${window.location.origin}/app`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
    },
  });

  if (error) {
    throw new Error('Nao foi possivel iniciar login com Google.');
  }
}

export async function getCurrentAuthSession() {
  if (!isSupabaseConfigured || !supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session ?? null;
}

export function subscribeToAuthChanges(callback) {
  if (!isSupabaseConfigured || !supabase) {
    return () => {};
  }

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session ?? null);
  });

  return () => {
    data.subscription.unsubscribe();
  };
}

export async function signOutCurrentUser() {
  if (!isSupabaseConfigured || !supabase) return;
  await supabase.auth.signOut();
}
