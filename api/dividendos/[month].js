import { forwardGetJson, normalizePathTemplate } from '../_lib/upstream.js';

const DIVIDENDS_PATH_TEMPLATE =
  String(process.env.FII_API_UPSTREAM_DIVIDENDS_PATH ?? '/dividendos/:month').trim() || '/dividendos/:month';

function isValidMonthParam(month) {
  const value = String(month ?? '').trim().toLowerCase();
  return /^[a-z0-9-]{3,24}$/.test(value);
}

export default async function handler(req, res) {
  const month = String(req.query?.month ?? '').trim().toLowerCase();
  if (!isValidMonthParam(month)) {
    return res.status(400).json({ error: 'Parametro de mes invalido.' });
  }

  const upstreamPath = normalizePathTemplate(DIVIDENDS_PATH_TEMPLATE, { month });
  return forwardGetJson({ req, res, upstreamPath });
}
