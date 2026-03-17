const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60000;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 120;
const rateLimitBuckets = new Map();

function getEnv(name, fallback = '') {
  return String(process.env[name] ?? fallback).trim();
}

function getUpstreamBaseUrl() {
  const value = getEnv('FII_API_UPSTREAM_BASE_URL');
  if (!value) {
    throw new Error('Missing FII_API_UPSTREAM_BASE_URL');
  }
  return value.replace(/\/$/, '');
}

function getTimeoutMs() {
  const raw = Number(getEnv('FII_API_TIMEOUT_MS', String(DEFAULT_TIMEOUT_MS)));
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.min(raw, 30000);
}

function getAllowedOrigins() {
  const raw = getEnv('FII_API_ALLOWED_ORIGINS');
  if (!raw) return [];

  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function isOriginAllowed(origin, allowedOrigins) {
  if (!origin) return true;
  if (!Array.isArray(allowedOrigins) || allowedOrigins.length === 0) return true;
  return allowedOrigins.includes(origin);
}

function getRequestOrigin(req) {
  return String(req.headers?.origin ?? '').trim();
}

function getClientIp(req) {
  const forwarded = String(req.headers?.['x-forwarded-for'] ?? '').trim();
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = String(req.headers?.['x-real-ip'] ?? '').trim();
  if (realIp) return realIp;

  return String(req.socket?.remoteAddress ?? 'unknown');
}

function getRateLimitConfig() {
  const windowMsRaw = Number(getEnv('FII_API_RATE_LIMIT_WINDOW_MS', String(DEFAULT_RATE_LIMIT_WINDOW_MS)));
  const maxRequestsRaw = Number(
    getEnv('FII_API_RATE_LIMIT_MAX_REQUESTS', String(DEFAULT_RATE_LIMIT_MAX_REQUESTS)),
  );

  const windowMs = Number.isFinite(windowMsRaw) && windowMsRaw > 0 ? Math.min(windowMsRaw, 3600000) : DEFAULT_RATE_LIMIT_WINDOW_MS;
  const maxRequests =
    Number.isFinite(maxRequestsRaw) && maxRequestsRaw > 0
      ? Math.min(maxRequestsRaw, 10000)
      : DEFAULT_RATE_LIMIT_MAX_REQUESTS;

  return { windowMs, maxRequests };
}

function consumeRateLimit(key, nowMs, config) {
  const existing = rateLimitBuckets.get(key);

  if (!existing || existing.resetAt <= nowMs) {
    rateLimitBuckets.set(key, {
      count: 1,
      resetAt: nowMs + config.windowMs,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: nowMs + config.windowMs,
    };
  }

  existing.count += 1;
  const remaining = Math.max(config.maxRequests - existing.count, 0);
  const allowed = existing.count <= config.maxRequests;

  return {
    allowed,
    remaining,
    resetAt: existing.resetAt,
  };
}

function maybeCleanupRateLimitBuckets(nowMs) {
  if (rateLimitBuckets.size < 5000) return;

  for (const [key, value] of rateLimitBuckets.entries()) {
    if (value.resetAt <= nowMs) {
      rateLimitBuckets.delete(key);
    }
  }
}

function buildTokenValue() {
  const token = getEnv('FII_API_TOKEN');
  const prefix = getEnv('FII_API_TOKEN_PREFIX', 'Bearer');
  if (!token) return '';
  if (!prefix) return token;
  return `${prefix} ${token}`;
}

function buildUpstreamHeaders() {
  const headers = {
    Accept: 'application/json',
  };

  const tokenValue = buildTokenValue();
  const tokenHeader = getEnv('FII_API_TOKEN_HEADER', 'Authorization');
  if (tokenValue && tokenHeader) {
    headers[tokenHeader] = tokenValue;
  }

  return headers;
}

function setCorsHeaders(res, requestOrigin, allowedOrigins) {
  const hasAllowlist = Array.isArray(allowedOrigins) && allowedOrigins.length > 0;
  if (!hasAllowlist) return;
  if (!requestOrigin) return;

  res.setHeader('Access-Control-Allow-Origin', requestOrigin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function setRateLimitHeaders(res, info, config) {
  res.setHeader('X-RateLimit-Limit', String(config.maxRequests));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(info.remaining, 0)));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(info.resetAt / 1000)));
}

function setResponseHeaders(res, requestOrigin = '', allowedOrigins = []) {
  setCorsHeaders(res, requestOrigin, allowedOrigins);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');
}

function sendError(res, statusCode, message, requestOrigin = '', allowedOrigins = []) {
  setResponseHeaders(res, requestOrigin, allowedOrigins);
  return res.status(statusCode).json({
    error: String(message ?? 'Erro interno.'),
  });
}

export function normalizePathTemplate(pathTemplate, replacements) {
  let path = String(pathTemplate ?? '').trim();
  Object.entries(replacements).forEach(([key, value]) => {
    path = path.replaceAll(`:${key}`, encodeURIComponent(String(value)));
  });

  if (!path.startsWith('/')) {
    return `/${path}`;
  }

  return path;
}

export async function forwardGetJson({ req, res, upstreamPath }) {
  const requestOrigin = getRequestOrigin(req);
  const allowedOrigins = getAllowedOrigins();

  if (!isOriginAllowed(requestOrigin, allowedOrigins)) {
    return sendError(res, 403, 'Origem nao permitida.', requestOrigin, allowedOrigins);
  }

  if (req.method === 'OPTIONS') {
    setResponseHeaders(res, requestOrigin, allowedOrigins);
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendError(res, 405, 'Metodo nao permitido.', requestOrigin, allowedOrigins);
  }

  const rateLimitConfig = getRateLimitConfig();
  const nowMs = Date.now();
  maybeCleanupRateLimitBuckets(nowMs);

  const rateLimitKey = `${getClientIp(req)}:${String(upstreamPath ?? '')}`;
  const rateLimitInfo = consumeRateLimit(rateLimitKey, nowMs, rateLimitConfig);
  setRateLimitHeaders(res, rateLimitInfo, rateLimitConfig);

  if (!rateLimitInfo.allowed) {
    res.setHeader('Retry-After', String(Math.max(Math.ceil((rateLimitInfo.resetAt - nowMs) / 1000), 1)));
    return sendError(res, 429, 'Limite de requisicoes excedido. Tente novamente em instantes.', requestOrigin, allowedOrigins);
  }

  let upstreamUrl;
  try {
    upstreamUrl = `${getUpstreamBaseUrl()}${upstreamPath}`;
  } catch {
    return sendError(res, 500, 'Backend de mercado nao configurado.', requestOrigin, allowedOrigins);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getTimeoutMs());

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'GET',
      headers: buildUpstreamHeaders(),
      signal: controller.signal,
    });

    const contentType = String(upstreamResponse.headers.get('content-type') ?? '').toLowerCase();
    let payload = null;

    if (contentType.includes('application/json')) {
      payload = await upstreamResponse.json();
    } else {
      const text = await upstreamResponse.text();
      payload = { raw: text };
    }

    setResponseHeaders(res, requestOrigin, allowedOrigins);
    return res.status(upstreamResponse.status).json(payload);
  } catch (error) {
    if (error?.name === 'AbortError') {
      return sendError(res, 504, 'Tempo limite ao consultar a API de mercado.', requestOrigin, allowedOrigins);
    }
    return sendError(res, 502, 'Falha ao consultar a API de mercado.', requestOrigin, allowedOrigins);
  } finally {
    clearTimeout(timeout);
  }
}
