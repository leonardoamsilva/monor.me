import { useState } from 'react';
import { FII_TICKERS } from '../data/fiiTickers';
import { fetchFiiDetails } from '../services/fiiApi';

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
      return await fetchFiiDetails(ticker);
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