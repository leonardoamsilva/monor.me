import { useState } from 'react';
import { FII_TICKERS } from '../data/fiiTickers';

const API_BASE = (import.meta.env.VITE_FII_API_BASE_URL ?? '').replace(/\/$/, '');
const DETAILS_PATH_TEMPLATE = import.meta.env.VITE_FII_API_DETAILS_PATH ?? '/api/fiis/:ticker';

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

function normalizeDetails(payload, ticker) {
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
  if (dividendYield > 0 && dividendYield < 1) {
    dividendYield *= 100;
  }

  return {
    price: toNumber(price),
    dividendYield,
  };
}

function useFiiSearch() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  function searchTickers(query) {
    if (!query?.trim()) {
      setResults([]);
      return;
    }

    const term = query.trim().toUpperCase();
    const filtered = FII_TICKERS.filter((symbol) => symbol.includes(term)).slice(0, 20);
    setResults(filtered);
  }

  async function getFiiDetails(ticker) {
    setLoading(true);
    try {
      const res = await fetch(buildDetailsUrl(ticker));
      const data = await res.json();

      if (!res.ok) return null;
      return normalizeDetails(data, ticker);
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }

  function clearResults() {
    setResults([]);
  }

  return { results, loading, searchTickers, getFiiDetails, clearResults };
}

export default useFiiSearch;