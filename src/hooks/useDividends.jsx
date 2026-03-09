import { useEffect, useMemo, useState } from 'react';
import { fetchMonthlyDividends } from '../services/dividendsApi';

const DIVIDENDS_CACHE_PREFIX = 'monor:dividends:';

function getTodayCacheKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildDividendsCacheKey(month, dayKey) {
  return `${DIVIDENDS_CACHE_PREFIX}${month}:${dayKey}`;
}

function cleanupOldDividendsCache(dayKey) {
  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (!key || !key.startsWith(DIVIDENDS_CACHE_PREFIX)) continue;
    if (!key.endsWith(`:${dayKey}`)) {
      localStorage.removeItem(key);
    }
  }
}

async function fetchMonthlyDividendsCached(month) {
  const dayKey = getTodayCacheKey();
  cleanupOldDividendsCache(dayKey);

  const cacheKey = buildDividendsCacheKey(month, dayKey);
  const cached = localStorage.getItem(cacheKey);

  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Ignore broken cache and refetch.
    }
  }

  const data = await fetchMonthlyDividends(month);
  localStorage.setItem(cacheKey, JSON.stringify(data));
  return data;
}

function buildMonthsRange(year, startMonth, endMonth) {
  const months = [];
  for (let month = startMonth; month <= endMonth; month += 1) {
    months.push(`${year}-${String(month).padStart(2, '0')}`);
  }
  return months;
}

function buildMonthsAcrossYears(startYear, startMonth, endYear, endMonth) {
  if (
    !Number.isInteger(startYear) ||
    !Number.isInteger(startMonth) ||
    !Number.isInteger(endYear) ||
    !Number.isInteger(endMonth)
  ) {
    return [];
  }

  const months = [];

  for (let year = startYear; year <= endYear; year += 1) {
    const fromMonth = year === startYear ? startMonth : 1;
    const toMonth = year === endYear ? endMonth : 12;

    for (let month = fromMonth; month <= toMonth; month += 1) {
      months.push(`${year}-${String(month).padStart(2, '0')}`);
    }
  }

  return months;
}

function sumPortfolioDividends(rows, quotaByTicker) {
  return rows.reduce((sum, row) => {
    const quotas = Number(quotaByTicker.get(row.ticker) ?? 0);
    return sum + quotas * Number(row.valuePerShare ?? 0);
  }, 0);
}

export function useDividends(fiis, selectedMonth) {
  const [rows, setRows] = useState([]);
  const [monthlyPortfolioTotal, setMonthlyPortfolioTotal] = useState(0);
  const [yearlyPortfolioTotal, setYearlyPortfolioTotal] = useState(0);
  const [yearlyPeriodLabel, setYearlyPeriodLabel] = useState('');
  const [allTimePortfolioTotal, setAllTimePortfolioTotal] = useState(0);
  const [allTimePeriodLabel, setAllTimePeriodLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const quotaByTicker = useMemo(() => {
    const map = new Map();
    fiis.forEach((fii) => {
      map.set(String(fii.ticker ?? '').trim().toUpperCase(), Number(fii.cotas ?? 0));
    });
    return map;
  }, [fiis]);

  const entryDate = useMemo(() => {
    const timestamps = fiis
      .map((fii) => Date.parse(String(fii.createdAt ?? '')))
      .filter((time) => Number.isFinite(time));

    if (timestamps.length === 0) return null;
    return new Date(Math.min(...timestamps));
  }, [fiis]);

  useEffect(() => {
    let cancelled = false;

    async function loadDividends() {
      if (!selectedMonth) return;

      setLoading(true);
      setError('');

      try {
        const monthRows = await fetchMonthlyDividendsCached(selectedMonth);
        const enrichedRows = monthRows.map((row) => {
          const quotas = Number(quotaByTicker.get(row.ticker) ?? 0);
          return {
            ...row,
            quotas,
            portfolioAmount: Number((quotas * row.valuePerShare).toFixed(2)),
            inPortfolio: quotas > 0,
          };
        });

        const currentMonthTotal = sumPortfolioDividends(enrichedRows, quotaByTicker);

        const [selectedYearText, selectedMonthText] = String(selectedMonth).split('-');
        const selectedYear = Number(selectedYearText);
        const selectedMonthNumber = Number(selectedMonthText);

        const entryYear = entryDate?.getFullYear() ?? selectedYear;
        const entryMonth = (entryDate?.getMonth() ?? 0) + 1;

        const rangeStartMonth = selectedYear === entryYear ? entryMonth : 1;
        const rangeEndMonth = Number.isInteger(selectedMonthNumber) ? selectedMonthNumber : 12;

        const months = buildMonthsRange(
          selectedYear,
          Math.max(1, Math.min(12, rangeStartMonth)),
          Math.max(1, Math.min(12, rangeEndMonth))
        );

        const periodStart = months[0] ?? '';
        const periodEnd = months[months.length - 1] ?? '';

        const allTimeMonths = buildMonthsAcrossYears(
          entryYear,
          entryMonth,
          selectedYear,
          Math.max(1, Math.min(12, rangeEndMonth))
        );

        const allTimeTotals = await Promise.all(
          allTimeMonths.map(async (month) => {
            const monthItems = await fetchMonthlyDividendsCached(month);
            return sumPortfolioDividends(monthItems, quotaByTicker);
          })
        );

        const allTimeStart = allTimeMonths[0] ?? '';
        const allTimeEnd = allTimeMonths[allTimeMonths.length - 1] ?? '';

        const ytdTotals = await Promise.all(
          months.map(async (month) => {
            const monthItems = await fetchMonthlyDividendsCached(month);
            return sumPortfolioDividends(monthItems, quotaByTicker);
          })
        );

        if (cancelled) return;

        setRows(enrichedRows);
        setMonthlyPortfolioTotal(Number(currentMonthTotal.toFixed(2)));
        setYearlyPortfolioTotal(Number(ytdTotals.reduce((sum, value) => sum + value, 0).toFixed(2)));
        setYearlyPeriodLabel(periodStart && periodEnd ? `${periodStart} ate ${periodEnd}` : '');
        setAllTimePortfolioTotal(Number(allTimeTotals.reduce((sum, value) => sum + value, 0).toFixed(2)));
        setAllTimePeriodLabel(allTimeStart && allTimeEnd ? `${allTimeStart} ate ${allTimeEnd}` : '');
      } catch {
        if (cancelled) return;
        setRows([]);
        setMonthlyPortfolioTotal(0);
        setYearlyPortfolioTotal(0);
        setYearlyPeriodLabel('');
        setAllTimePortfolioTotal(0);
        setAllTimePeriodLabel('');
        setError('Nao foi possivel carregar os proventos reais neste momento.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDividends();

    return () => {
      cancelled = true;
    };
  }, [entryDate, quotaByTicker, selectedMonth]);

  return {
    rows,
    monthlyPortfolioTotal,
    yearlyPortfolioTotal,
    yearlyPeriodLabel,
    allTimePortfolioTotal,
    allTimePeriodLabel,
    loading,
    error,
  };
}
