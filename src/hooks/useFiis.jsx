import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchFiiDetails } from "../services/fiiApi";

const FIIS_STORAGE_KEY = "monor:fiis";
const LAST_REFRESH_DAY_KEY = "monor:fiis:last-refresh-day";
const LAST_REFRESH_LEGACY_KEY = "monor:fiis:last-refresh";

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isDailyRefreshDue(lastRefreshDay) {
  return lastRefreshDay !== getTodayKey();
}

function calculateMonthlyIncome(cotas, currentPrice, dividendYield) {
  const monthlyIncome = (Number(dividendYield) / 12 / 100) * Number(currentPrice) * Number(cotas);
  return Number(monthlyIncome.toFixed(2));
}

export function useFiis() {
  const [fiis, setFiis] = useState(() => {
    const storedFiis = localStorage.getItem(FIIS_STORAGE_KEY);
    if (!storedFiis) return [];

    try {
      const parsed = JSON.parse(storedFiis);
      if (!Array.isArray(parsed)) return [];

      return parsed.map((fii) => ({
        ...fii,
        tipo: String(fii?.tipo ?? "Outros").trim() || "Outros",
      }));
    } catch {
      return [];
    }
  });

  const [refreshingQuotes, setRefreshingQuotes] = useState(false);

  const portfolioFingerprint = useMemo(
    () =>
      fiis
        .map((fii) => `${String(fii.ticker ?? "").trim().toUpperCase()}|${Number(fii.cotas ?? 0)}|${Number(fii.precoMedio ?? 0)}|${String(fii.createdAt ?? "")}`)
        .sort()
        .join("||"),
    [fiis]
  );

  const previousFingerprintRef = useRef(portfolioFingerprint);

  const refreshFiisQuotes = useCallback(async (force = false) => {
    if (refreshingQuotes || fiis.length === 0) return;

    const lastRefreshDay =
      localStorage.getItem(LAST_REFRESH_DAY_KEY) ??
      localStorage.getItem(LAST_REFRESH_LEGACY_KEY);

    if (!force && !isDailyRefreshDue(lastRefreshDay)) return;

    setRefreshingQuotes(true);
    try {
      const updatedFiis = await Promise.all(
        fiis.map(async (fii) => {
          const details = await fetchFiiDetails(fii.ticker);
          if (!details) return fii;

          const currentPrice = details.price > 0 ? details.price : Number(fii.valorAtual ?? fii.precoMedio ?? 0);
          const currentDy = details.dividendYield > 0 ? details.dividendYield : Number(fii.dividendYield ?? 0);
          const currentType = String(details.segmentType ?? fii.tipo ?? "Outros").trim() || "Outros";

          return {
            ...fii,
            tipo: currentType,
            valorAtual: currentPrice,
            dividendYield: currentDy,
            rendaMensal: calculateMonthlyIncome(fii.cotas, currentPrice, currentDy),
            lastQuoteAt: new Date().toISOString(),
          };
        })
      );

      setFiis(updatedFiis);
      localStorage.setItem(LAST_REFRESH_DAY_KEY, getTodayKey());
      localStorage.removeItem(LAST_REFRESH_LEGACY_KEY);
    } finally {
      setRefreshingQuotes(false);
    }
  }, [fiis, refreshingQuotes]);

  useEffect(() => {
    localStorage.setItem(FIIS_STORAGE_KEY, JSON.stringify(fiis));
  }, [fiis]);

  useEffect(() => {
    // Daily automatic refresh only once per app entry/day.
    refreshFiisQuotes(false);
  }, [refreshFiisQuotes]);

  useEffect(() => {
    // Force refresh when user changes portfolio data (add/edit/remove).
    if (previousFingerprintRef.current !== portfolioFingerprint) {
      previousFingerprintRef.current = portfolioFingerprint;
      refreshFiisQuotes(true);
    }
  }, [portfolioFingerprint, refreshFiisQuotes]);

  return {
    fiis,
    setFiis,
    refreshFiisQuotes,
    refreshingQuotes,
  };
}