import { getSupabaseClient, isSupabaseConfigured } from './auth';

const TABLE_NAME = 'dividend_eligibility_overrides';

function normalizeUserId(userId) {
  return String(userId ?? '').trim();
}

function normalizeOverrideKey(overrideKey) {
  return String(overrideKey ?? '').trim().toUpperCase();
}

function getClientOrThrow() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase nao configurado para persistir confirmacoes de provento.');
  }

  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Cliente Supabase indisponivel.');
  }

  return client;
}

export async function fetchDividendEligibilityOverrides(userId) {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) return {};

  const client = getClientOrThrow();
  const { data, error } = await client
    .from(TABLE_NAME)
    .select('override_key')
    .eq('user_id', normalizedUserId);

  if (error) throw error;

  return (data ?? []).reduce((acc, row) => {
    const key = normalizeOverrideKey(row?.override_key);
    if (!key) return acc;
    acc[key] = true;
    return acc;
  }, {});
}

export async function upsertDividendEligibilityOverride(userId, overrideKey) {
  const normalizedUserId = normalizeUserId(userId);
  const normalizedKey = normalizeOverrideKey(overrideKey);
  if (!normalizedUserId || !normalizedKey) return;

  const client = getClientOrThrow();
  const { error } = await client
    .from(TABLE_NAME)
    .upsert(
      {
        user_id: normalizedUserId,
        override_key: normalizedKey,
      },
      {
        onConflict: 'user_id,override_key',
      },
    );

  if (error) throw error;
}

export async function deleteDividendEligibilityOverride(userId, overrideKey) {
  const normalizedUserId = normalizeUserId(userId);
  const normalizedKey = normalizeOverrideKey(overrideKey);
  if (!normalizedUserId || !normalizedKey) return;

  const client = getClientOrThrow();
  const { error } = await client
    .from(TABLE_NAME)
    .delete()
    .eq('user_id', normalizedUserId)
    .eq('override_key', normalizedKey);

  if (error) throw error;
}

export async function deleteDividendEligibilityOverridesByKeys(userId, overrideKeys) {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId || !Array.isArray(overrideKeys) || overrideKeys.length === 0) return;

  const normalizedKeys = overrideKeys
    .map(normalizeOverrideKey)
    .filter(Boolean);

  if (normalizedKeys.length === 0) return;

  const client = getClientOrThrow();
  const { error } = await client
    .from(TABLE_NAME)
    .delete()
    .eq('user_id', normalizedUserId)
    .in('override_key', normalizedKeys);

  if (error) throw error;
}
