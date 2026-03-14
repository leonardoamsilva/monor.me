import { useEffect, useMemo, useState } from 'react';
import { fetchMonthlyDividends } from '../services/dividendsApi';

const DIVIDENDS_CACHE_PREFIX = 'monor:dividends:';
const ELIGIBILITY_OVERRIDES_KEY = 'monor:eligibility-overrides';
const LEGACY_ELIGIBILITY_OVERRIDES_KEY = 'monor:dividends:eligibility-overrides';

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

function monthFromDate(value) {
  if (!value || typeof value !== 'string') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.slice(0, 7);
  return null;
}

function readEligibilityOverrides() {
  try {
    const raw =
      localStorage.getItem(ELIGIBILITY_OVERRIDES_KEY) ??
      localStorage.getItem(LEGACY_ELIGIBILITY_OVERRIDES_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
}

function writeEligibilityOverrides(overrides) {
  localStorage.setItem(ELIGIBILITY_OVERRIDES_KEY, JSON.stringify(overrides));
  localStorage.removeItem(LEGACY_ELIGIBILITY_OVERRIDES_KEY);
}

function buildEligibilityOverrideKey(row, monthReference = '') {
  const ticker = String(row?.ticker ?? '').trim().toUpperCase();
  const month =
    monthFromDate(String(row?.comDate ?? '')) ??
    monthFromDate(String(row?.paymentDate ?? '')) ??
    String(monthReference ?? '').trim();

  if (!ticker || !month) return null;
  return `${ticker}|${month}`;
}

function toStartOfLocalDayTimestamp(value) {
  if (!value) return null;

  const raw = String(value).trim();
  const dateOnlyMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);
    return new Date(year, month - 1, day).getTime();
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;

  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()).getTime();
}

function isEligibleForDividend(entryDateTimestamp, row) {
  if (!Number.isFinite(entryDateTimestamp)) return true;

  const eligibilityDateTimestamp =
    toStartOfLocalDayTimestamp(row?.comDate) ??
    toStartOfLocalDayTimestamp(row?.paymentDate);

  if (!Number.isFinite(eligibilityDateTimestamp)) return true;
  return entryDateTimestamp <= eligibilityDateTimestamp;
}

function sumPortfolioDividends(rows, positionByTicker, eligibilityOverrides, monthReference) {
  return rows.reduce((sum, row) => {
    const position = positionByTicker.get(row.ticker);
    const quotas = Number(position?.quotas ?? 0);
    const entryDateTimestamp = position?.entryDateTimestamp;
    const baseEligibility = isEligibleForDividend(entryDateTimestamp, row);
    const overrideKey = buildEligibilityOverrideKey(row, monthReference);
    const manuallyConfirmed = Boolean(overrideKey && eligibilityOverrides[overrideKey]);
    const eligibleQuotas = baseEligibility || manuallyConfirmed ? quotas : 0;

    return sum + eligibleQuotas * Number(row.valuePerShare ?? 0);
  }, 0);
}

function getEarliestEntryDate(positionByTicker) {
  const timestamps = Array.from(positionByTicker.values())
    .map((position) => position?.entryDateTimestamp)
    .filter((time) => Number.isFinite(time));

  if (timestamps.length === 0) return null;
  return new Date(Math.min(...timestamps));
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
  const [eligibilityOverrides, setEligibilityOverrides] = useState(() => readEligibilityOverrides());

  const positionByTicker = useMemo(() => {
    const map = new Map();
    fiis.forEach((fii) => {
      const ticker = String(fii.ticker ?? '').trim().toUpperCase();
      const quotas = Number(fii.cotas ?? 0);
      const entryDateTimestamp = toStartOfLocalDayTimestamp(fii.createdAt);

      map.set(ticker, {
        quotas,
        entryDateTimestamp,
      });
    });
    return map;
  }, [fiis]);

  const entryDate = useMemo(() => getEarliestEntryDate(positionByTicker), [positionByTicker]);

  useEffect(() => {
    let cancelled = false;

    async function loadDividends() {
      if (!selectedMonth) return;

      setLoading(true);
      setError('');

      try {
        const monthRows = await fetchMonthlyDividendsCached(selectedMonth);
        const enrichedRows = monthRows.map((row) => {
          const position = positionByTicker.get(row.ticker);
          const quotas = Number(position?.quotas ?? 0);
          const entryDateTimestamp = position?.entryDateTimestamp;
          const baseEligibility = isEligibleForDividend(entryDateTimestamp, row);
          const overrideKey = buildEligibilityOverrideKey(row, selectedMonth);
          const manuallyConfirmed = Boolean(overrideKey && eligibilityOverrides[overrideKey]);
          const eligibleForDividend = baseEligibility || manuallyConfirmed;

          return {
            ...row,
            quotas,
            baseEligibility,
            manuallyConfirmed,
            canConfirmManually: quotas > 0 && !baseEligibility,
            eligibleForDividend,
            portfolioAmount: Number(((eligibleForDividend ? quotas : 0) * row.valuePerShare).toFixed(2)),
            inPortfolio: quotas > 0 && eligibleForDividend,
          };
        });

        const currentMonthTotal = sumPortfolioDividends(
          enrichedRows,
          positionByTicker,
          eligibilityOverrides,
          selectedMonth
        );

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
            return sumPortfolioDividends(monthItems, positionByTicker, eligibilityOverrides, month);
          })
        );

        const allTimeStart = allTimeMonths[0] ?? '';
        const allTimeEnd = allTimeMonths[allTimeMonths.length - 1] ?? '';

        const ytdTotals = await Promise.all(
          months.map(async (month) => {
            const monthItems = await fetchMonthlyDividendsCached(month);
            return sumPortfolioDividends(monthItems, positionByTicker, eligibilityOverrides, month);
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
        setError('Nao foi possível carregar os proventos reais neste momento.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDividends();

    return () => {
      cancelled = true;
    };
  }, [eligibilityOverrides, entryDate, positionByTicker, selectedMonth]);

  function confirmDividendEligibility(row, monthReference = selectedMonth) {
    const key = buildEligibilityOverrideKey(row, monthReference);
    if (!key) return;

    setEligibilityOverrides((previous) => {
      const next = {
        ...previous,
        [key]: true,
      };

      writeEligibilityOverrides(next);
      return next;
    });
  }

  function revokeDividendEligibility(row, monthReference = selectedMonth) {
    const key = buildEligibilityOverrideKey(row, monthReference);
    if (!key) return;

    setEligibilityOverrides((previous) => {
      if (!Object.prototype.hasOwnProperty.call(previous, key)) return previous;

      const next = { ...previous };
      delete next[key];
      writeEligibilityOverrides(next);
      return next;
    });
  }

  return {
    rows,
    monthlyPortfolioTotal,
    yearlyPortfolioTotal,
    yearlyPeriodLabel,
    allTimePortfolioTotal,
    allTimePeriodLabel,
    loading,
    error,
    confirmDividendEligibility,
    revokeDividendEligibility,
  };
}
