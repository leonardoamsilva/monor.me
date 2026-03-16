import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchFiiDetails } from "../services/fiiApi";
import { useAuth } from "../contexts/useAuth";
import { fetchUserFiis, syncUserFiis } from "../services/portfolioStore";

const fiisSessionCache = {
  userId: null,
  fiis: [],
  hydrated: false,
  lastRefreshDay: null,
};

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
  const { user, isAuthenticated } = useAuth();
  const [fiis, setFiis] = useState([]);
  const [loadingFiis, setLoadingFiis] = useState(true);
  const [syncReady, setSyncReady] = useState(false);

  const [refreshingQuotes, setRefreshingQuotes] = useState(false);
  const skipNextSyncRef = useRef(false);
  const lastRefreshDayRef = useRef(fiisSessionCache.lastRefreshDay);

  const portfolioFingerprint = useMemo(
    () =>
      fiis
        .map((fii) => `${String(fii.ticker ?? "").trim().toUpperCase()}|${Number(fii.cotas ?? 0)}|${Number(fii.precoMedio ?? 0)}|${String(fii.createdAt ?? "")}`)
        .sort()
        .join("||"),
    [fiis]
  );

  const previousFingerprintRef = useRef(portfolioFingerprint);

  useEffect(() => {
    let cancelled = false;

    async function loadFiisFromSupabase() {
      if (!isAuthenticated || !user?.id) {
        setFiis([]);
        setLoadingFiis(false);
        setSyncReady(false);
        fiisSessionCache.userId = null;
        fiisSessionCache.fiis = [];
        fiisSessionCache.hydrated = false;
        fiisSessionCache.lastRefreshDay = null;
        lastRefreshDayRef.current = null;
        return;
      }

      if (fiisSessionCache.hydrated && fiisSessionCache.userId === user.id) {
        skipNextSyncRef.current = true;
        setFiis(fiisSessionCache.fiis);
        setLoadingFiis(false);
        setSyncReady(true);
        lastRefreshDayRef.current = fiisSessionCache.lastRefreshDay;
        return;
      }

      setLoadingFiis(true);
      setSyncReady(false);

      try {
        const remoteFiis = await fetchUserFiis(user.id);
        if (cancelled) return;

        skipNextSyncRef.current = true;
        setFiis(remoteFiis);
        setSyncReady(true);
        fiisSessionCache.userId = user.id;
        fiisSessionCache.fiis = remoteFiis;
        fiisSessionCache.hydrated = true;
        fiisSessionCache.lastRefreshDay = lastRefreshDayRef.current;
      } catch {
        if (cancelled) return;
        setFiis([]);
        setSyncReady(false);
      } finally {
        if (!cancelled) {
          setLoadingFiis(false);
        }
      }
    }

    loadFiisFromSupabase();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?.id]);

  const refreshFiisQuotes = useCallback(async (force = false) => {
    if (refreshingQuotes || fiis.length === 0) return;

    const lastRefreshDay = lastRefreshDayRef.current;

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
      lastRefreshDayRef.current = getTodayKey();
      fiisSessionCache.lastRefreshDay = lastRefreshDayRef.current;
    } finally {
      setRefreshingQuotes(false);
    }
  }, [fiis, refreshingQuotes]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id || loadingFiis || !syncReady) return;

    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return;
    }

    fiisSessionCache.userId = user.id;
    fiisSessionCache.fiis = fiis;
    fiisSessionCache.hydrated = true;
    fiisSessionCache.lastRefreshDay = lastRefreshDayRef.current;

    syncUserFiis(user.id, fiis).catch(() => {});
  }, [fiis, isAuthenticated, loadingFiis, syncReady, user?.id]);

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
    loadingFiis,
    refreshFiisQuotes,
    refreshingQuotes,
  };
}