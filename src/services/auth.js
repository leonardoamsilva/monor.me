import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const SUPABASE_ANON_KEY = String(import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();
const SUPABASE_REDIRECT_TO = String(import.meta.env.VITE_SUPABASE_REDIRECT_TO ?? '').trim();

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
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

  const redirectTo = SUPABASE_REDIRECT_TO || `${window.location.origin}/app`;
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

export async function syncGoogleProfile() {
  if (!isSupabaseConfigured || !supabase) return null;

  const session = await getCurrentAuthSession();
  if (!session?.user) return null;

  const { id, email, user_metadata } = session.user;
  const fullName = user_metadata?.name || user_metadata?.full_name || email?.split('@')[0] || 'Usuário';

  // Extrai apenas o primeiro nome para exibir no dashboard
  const displayName = fullName.split(' ')[0];

  return upsertUserProfile(id, {
    email,
    full_name: fullName,
    display_name: displayName,
  });
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

export async function upsertUserProfile(userId, userData) {
  if (!isSupabaseConfigured || !supabase) return null;

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        ...userData,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (error) {
    console.error('Erro ao salvar perfil:', error);
    return null;
  }

  return data;
}

export async function getUserProfile(userId) {
  if (!isSupabaseConfigured || !supabase) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Erro ao buscar perfil:', error);
    return null;
  }

  return data;
}

export async function signOutCurrentUser() {
  if (!isSupabaseConfigured || !supabase) return;
  await supabase.auth.signOut();
}
