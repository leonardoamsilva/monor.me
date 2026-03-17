import { forwardGetJson, normalizePathTemplate } from '../_lib/upstream.js';

const DETAILS_PATH_TEMPLATE =
  String(process.env.FII_API_UPSTREAM_DETAILS_PATH ?? '/fii/:ticker').trim() || '/fii/:ticker';

function isValidTicker(ticker) {
  const value = String(ticker ?? '').trim().toUpperCase();
  return /^[A-Z0-9]{4,12}$/.test(value);
}

export default async function handler(req, res) {
  const ticker = String(req.query?.ticker ?? '').trim().toUpperCase();
  if (!isValidTicker(ticker)) {
    return res.status(400).json({ error: 'Ticker invalido.' });
  }

  const upstreamPath = normalizePathTemplate(DETAILS_PATH_TEMPLATE, { ticker });
  return forwardGetJson({ req, res, upstreamPath });
}
