import { buildApiHeaders } from './apiClient';

const API_BASE = (import.meta.env.VITE_FII_API_BASE_URL ?? '').replace(/\/$/, '');
const DETAILS_PATH_TEMPLATE = import.meta.env.VITE_FII_API_DETAILS_PATH ?? '/api/fii/:ticker';

function buildDetailsUrl(ticker) {
  const safeTicker = encodeURIComponent(String(ticker ?? '').trim());
  const path = DETAILS_PATH_TEMPLATE.includes(':ticker')
    ? DETAILS_PATH_TEMPLATE.replace(':ticker', safeTicker)
    : `${DETAILS_PATH_TEMPLATE.replace(/\/$/, '')}/${safeTicker}`;
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}

function toNumber(value, fallback = 0) {
  if (typeof value === 'string') {
    const normalized = value.replace('%', '').replace(/\./g, '').replace(',', '.').trim();
    const number = Number(normalized);
    return Number.isFinite(number) ? number : fallback;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeDetails(payload) {
  const source = payload?.result ?? payload?.data ?? payload?.results?.[0] ?? payload;
  const marketData = source?.marketData ?? source?.quote ?? source;

  const price =
    source?.valor_cota ??
    marketData?.price ??
    marketData?.regularMarketPrice ??
    marketData?.currentPrice ??
    source?.price;

  let dividendYield =
    source?.dividend_yield_12m ??
    source?.dividendYield ??
    source?.dividend_yield ??
    source?.dy ??
    source?.fundamental?.dividendYield;

  dividendYield = toNumber(dividendYield);
  if (dividendYield > 0 && dividendYield < 1) dividendYield *= 100;

  const segmentTypeRaw =
    source?.segmento_anbima ??
    source?.segmentoAnbima ??
    source?.segmento ??
    source?.segment ??
    source?.fundamental?.segmento_anbima;

  const segmentType = String(segmentTypeRaw ?? '').trim();

  return {
    price: toNumber(price),
    dividendYield,
    segmentType: segmentType || 'Outros',
  };
}

export async function fetchFiiDetails(ticker) {
  try {
    const res = await fetch(buildDetailsUrl(ticker), {
      headers: buildApiHeaders(),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return normalizeDetails(data);
  } catch {
    return null;
  }
}
