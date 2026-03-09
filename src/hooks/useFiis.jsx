import { useEffect, useState } from "react";
import { fetchFiiDetails } from "../services/fiiApi";

const FIIS_STORAGE_KEY = "monor:fiis";
const LAST_REFRESH_KEY = "monor:fiis:last-refresh";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function isDailyRefreshDue(lastRefreshAt) {
  if (!lastRefreshAt) return true;
  const lastTimestamp = Number(lastRefreshAt);
  if (!Number.isFinite(lastTimestamp)) return true;
  return Date.now() - lastTimestamp >= ONE_DAY_MS;
}

function calculateMonthlyIncome(cotas, currentPrice, dividendYield) {
  const monthlyIncome = (Number(dividendYield) / 12 / 100) * Number(currentPrice) * Number(cotas);
  return Number(monthlyIncome.toFixed(2));
}

export function useFiis() {
  const [fiis, setFiis] = useState(() => {
    const storedFiis = localStorage.getItem(FIIS_STORAGE_KEY);
    return storedFiis ? JSON.parse(storedFiis) : [];
  });

  const [refreshingQuotes, setRefreshingQuotes] = useState(false);

  async function refreshFiisQuotes(force = false) {
    if (refreshingQuotes || fiis.length === 0) return;

    const lastRefreshAt = localStorage.getItem(LAST_REFRESH_KEY);
    if (!force && !isDailyRefreshDue(lastRefreshAt)) return;

    setRefreshingQuotes(true);
    try {
      const updatedFiis = await Promise.all(
        fiis.map(async (fii) => {
          const details = await fetchFiiDetails(fii.ticker);
          if (!details) return fii;

          const currentPrice = details.price > 0 ? details.price : Number(fii.valorAtual ?? fii.precoMedio ?? 0);
          const currentDy = details.dividendYield > 0 ? details.dividendYield : Number(fii.dividendYield ?? 0);

          return {
            ...fii,
            valorAtual: currentPrice,
            dividendYield: currentDy,
            rendaMensal: calculateMonthlyIncome(fii.cotas, currentPrice, currentDy),
            lastQuoteAt: new Date().toISOString(),
          };
        })
      );

      setFiis(updatedFiis);
      localStorage.setItem(LAST_REFRESH_KEY, String(Date.now()));
    } finally {
      setRefreshingQuotes(false);
    }
  }

  useEffect(() => {
    localStorage.setItem(FIIS_STORAGE_KEY, JSON.stringify(fiis));
  }, [fiis]);

  useEffect(() => {
    refreshFiisQuotes(false);
  }, [fiis.length]);

  return {
    fiis,
    setFiis,
    refreshFiisQuotes,
    refreshingQuotes,
  };
}