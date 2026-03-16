import { getSupabaseClient, isSupabaseConfigured } from './auth';

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function calculateMonthlyIncome(cotas, currentPrice, dividendYield) {
  const monthlyIncome = (toNumber(dividendYield) / 12 / 100) * toNumber(currentPrice) * toNumber(cotas);
  return Number(monthlyIncome.toFixed(2));
}

function toClientFii(row) {
  const cotas = toNumber(row.quotas);
  const precoMedio = toNumber(row.average_price);
  const valorAtual = toNumber(row.current_price, precoMedio);
  const dividendYield = toNumber(row.dividend_yield_12m);
  const createdAt = row.entry_date
    ? new Date(`${row.entry_date}T00:00:00.000Z`).toISOString()
    : String(row.created_at ?? new Date().toISOString());

  return {
    ticker: String(row.ticker ?? '').trim().toUpperCase(),
    tipo: String(row.segment_type ?? 'Outros').trim() || 'Outros',
    cotas,
    precoMedio,
    valorAtual,
    dividendYield,
    rendaMensal: calculateMonthlyIncome(cotas, valorAtual, dividendYield),
    createdAt,
    lastQuoteAt: row.last_quote_at ?? null,
  };
}

function toDbPosition(portfolioId, fii) {
  const ticker = String(fii?.ticker ?? '').trim().toUpperCase();
  const createdAt = String(fii?.createdAt ?? '').trim();
  const entryDate = /^\d{4}-\d{2}-\d{2}/.test(createdAt) ? createdAt.slice(0, 10) : null;

  return {
    portfolio_id: portfolioId,
    ticker,
    asset_type: 'FII',
    quotas: toNumber(fii?.cotas),
    average_price: toNumber(fii?.precoMedio),
    current_price: toNumber(fii?.valorAtual, toNumber(fii?.precoMedio)),
    dividend_yield_12m: toNumber(fii?.dividendYield),
    segment_type: String(fii?.tipo ?? 'Outros').trim() || 'Outros',
    entry_date: entryDate,
    last_quote_at: fii?.lastQuoteAt ?? null,
  };
}

async function getOrCreateDefaultPortfolioId(client, userId) {
  const { data, error } = await client
    .from('portfolios')
    .select('id')
    .eq('user_id', userId)
    .eq('name', 'Carteira principal')
    .maybeSingle();

  if (error) throw error;
  if (data?.id) return data.id;

  const { data: inserted, error: insertError } = await client
    .from('portfolios')
    .insert({
      user_id: userId,
      name: 'Carteira principal',
      base_currency: 'BRL',
    })
    .select('id')
    .single();

  if (insertError) throw insertError;
  return inserted.id;
}

export async function fetchUserFiis(userId) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase nao configurado para carregar carteira.');
  }

  const client = getSupabaseClient();
  if (!client) throw new Error('Cliente Supabase indisponivel.');

  const portfolioId = await getOrCreateDefaultPortfolioId(client, userId);

  const { data, error } = await client
    .from('portfolio_positions')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map(toClientFii);
}

export async function syncUserFiis(userId, fiis) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase nao configurado para salvar carteira.');
  }

  const client = getSupabaseClient();
  if (!client) throw new Error('Cliente Supabase indisponivel.');

  const portfolioId = await getOrCreateDefaultPortfolioId(client, userId);
  const normalizedFiis = Array.isArray(fiis) ? fiis : [];

  if (normalizedFiis.length === 0) {
    const { error: deleteAllError } = await client
      .from('portfolio_positions')
      .delete()
      .eq('portfolio_id', portfolioId);

    if (deleteAllError) throw deleteAllError;
    return;
  }

  const rows = normalizedFiis.map((fii) => toDbPosition(portfolioId, fii));
  const desiredTickers = rows.map((row) => row.ticker);

  const { error: upsertError } = await client
    .from('portfolio_positions')
    .upsert(rows, { onConflict: 'portfolio_id,ticker' });

  if (upsertError) throw upsertError;

  const { data: existingRows, error: existingError } = await client
    .from('portfolio_positions')
    .select('ticker')
    .eq('portfolio_id', portfolioId);

  if (existingError) throw existingError;

  const tickersToDelete = (existingRows ?? [])
    .map((row) => String(row.ticker ?? '').trim().toUpperCase())
    .filter((ticker) => !desiredTickers.includes(ticker));

  if (tickersToDelete.length === 0) return;

  const { error: deleteError } = await client
    .from('portfolio_positions')
    .delete()
    .eq('portfolio_id', portfolioId)
    .in('ticker', tickersToDelete);

  if (deleteError) throw deleteError;
}
