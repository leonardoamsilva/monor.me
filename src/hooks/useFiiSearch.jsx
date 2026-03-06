import { useState } from 'react';

// Usa proxy no dev (Vite) para evitar CORS com o header x-brapi-key
const BRAPI_BASE = import.meta.env.VITE_BRAPI_PROXY_URL ?? '';

function useFiiSearch() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  async function searchTickers(query) {
    if (!query?.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    setResults([]);
    try {
      const res = await fetch(
        `${BRAPI_BASE}/api/brapi/available?search=${encodeURIComponent(query.trim())}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erro ao buscar');
      const stocks = data.stocks ?? data.symbols ?? [];
      const fiis = Array.isArray(stocks)
        ? stocks.filter((item) => (typeof item === 'object' ? item?.type === 'FII' : true))
        : [];
      setResults(fiis);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  async function getFiiDetails(ticker) {
    setLoading(true);
    try {
      const res = await fetch(
        `${BRAPI_BASE}/api/brapi/quote/${encodeURIComponent(ticker)}?range=1d&fundamental=true`
      );
      const data = await res.json();
      console.log(res)
      if (!res.ok || !data.results?.[0]) return null;
      const r = data.results[0];
      const price = r.regularMarketPrice ?? r.marketPrice ?? r.price ?? 0;
      let dividendYield = r.fundamental?.dividendYield ?? r.dividendYield ?? 0;
      console.log('[getFiiDetails] dividendYield:', dividendYield);
      if (dividendYield > 0 && dividendYield < 1) dividendYield = dividendYield * 100;
      return {
        price: Number(price),
        dividendYield: Number(dividendYield),
        name: r.shortName ?? r.longName ?? ticker
      };
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