import { buildApiHeaders } from './apiClient';

const API_BASE = (import.meta.env.VITE_FII_API_BASE_URL ?? '').replace(/\/$/, '');
const DIVIDENDS_PATH_TEMPLATE = import.meta.env.VITE_FII_API_DIVIDENDS_PATH ?? '/api/dividendos/:month';

const PT_MONTHS = [
  'janeiro',
  'fevereiro',
  'marco',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

function toApiMonthParam(month) {
  const raw = String(month ?? '').trim().toLowerCase();
  const match = raw.match(/^(\d{4})-(\d{2})$/);
  if (!match) return raw;

  const numericMonth = Number(match[2]);
  if (!Number.isInteger(numericMonth) || numericMonth < 1 || numericMonth > 12) return raw;
  return PT_MONTHS[numericMonth - 1];
}

function buildDividendsUrl(month) {
  const safeMonth = encodeURIComponent(toApiMonthParam(month));
  const path = DIVIDENDS_PATH_TEMPLATE.includes(':month')
    ? DIVIDENDS_PATH_TEMPLATE.replace(':month', safeMonth)
    : `${DIVIDENDS_PATH_TEMPLATE.replace(/\/$/, '')}/${safeMonth}`;
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

function normalizeDividendItem(item) {
  const ticker = String(item?.ticker ?? item?.symbol ?? item?.codigo ?? item?.papel ?? '').trim().toUpperCase();
  if (!ticker) return null;

  const valuePerShare =
    item?.valor_por_cota ??
    item?.valorCota ??
    item?.dividend ??
    item?.provento ??
    item?.valor;

  return {
    ticker,
    valuePerShare: toNumber(valuePerShare),
    comDate: normalizeDate(item?.data_com ?? item?.dataCom ?? item?.com_date ?? null),
    paymentDate: normalizeDate(item?.data_pagamento ?? item?.dataPagamento ?? item?.payment_date ?? null),
    type: item?.tipo ?? item?.type ?? null,
  };
}

function normalizeDate(value) {
  if (!value) return null;
  const raw = String(value).trim();

  // Already ISO-like
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(0, 10);
  }

  // BR short format: dd/mm/aa or dd/mm/aaaa
  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/);
  if (!match) return raw;

  const day = match[1];
  const month = match[2];
  const yearPart = match[3];
  const fullYear = yearPart.length === 2 ? `20${yearPart}` : yearPart;
  return `${fullYear}-${month}-${day}`;
}

function monthFromDate(value) {
  if (!value || typeof value !== 'string') return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.slice(0, 7);
  return null;
}

function extractList(payload) {
  if (Array.isArray(payload)) return payload;

  return (
    payload?.dividendos ??
    payload?.results ??
    payload?.result ??
    payload?.data ??
    payload?.dividends ??
    payload?.proventos ??
    payload?.items ??
    []
  );
}

export async function fetchMonthlyDividends(month) {
  const res = await fetch(buildDividendsUrl(month), {
    headers: buildApiHeaders(),
  });
  if (!res.ok) {
    throw new Error('Nao foi possivel carregar os proventos do mes.');
  }

  const data = await res.json();
  const rows = extractList(data);
  if (!Array.isArray(rows)) return [];

  const normalizedRows = rows
    .map(normalizeDividendItem)
    .filter((item) => item && item.ticker && item.valuePerShare >= 0);

  if (!/^\d{4}-\d{2}$/.test(String(month ?? ''))) {
    return normalizedRows;
  }

  // Some APIs may return all dividends regardless of requested month.
  // Keep only rows that match the selected month using payment/com dates.
  return normalizedRows.filter((row) => {
    const paymentMonth = monthFromDate(row.paymentDate);
    const comMonth = monthFromDate(row.comDate);
    return paymentMonth === month || comMonth === month;
  });
}

export function getCurrentMonthString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getMonthsFromYearStart(monthString) {
  const [yearText, monthText] = String(monthString).split('-');
  const year = Number(yearText);
  const month = Number(monthText);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return [];
  }

  const months = [];
  for (let current = 1; current <= month; current += 1) {
    months.push(`${year}-${String(current).padStart(2, '0')}`);
  }

  return months;
}
