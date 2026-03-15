const API_TOKEN = String(import.meta.env.VITE_FII_API_TOKEN ?? '').trim();
const API_TOKEN_HEADER = String(import.meta.env.VITE_FII_API_TOKEN_HEADER ?? 'Authorization').trim();
const API_TOKEN_PREFIX = String(import.meta.env.VITE_FII_API_TOKEN_PREFIX ?? 'Bearer').trim();

function buildTokenValue() {
  if (!API_TOKEN) return '';
  if (!API_TOKEN_PREFIX) return API_TOKEN;
  return `${API_TOKEN_PREFIX} ${API_TOKEN}`;
}

export function buildApiHeaders(customHeaders = {}) {
  const headers = {
    Accept: 'application/json',
    ...customHeaders,
  };

  const tokenValue = buildTokenValue();
  if (tokenValue && API_TOKEN_HEADER) {
    headers[API_TOKEN_HEADER] = tokenValue;
  }

  return headers;
}

export function buildJsonApiHeaders(customHeaders = {}) {
  return buildApiHeaders({
    'Content-Type': 'application/json',
    ...customHeaders,
  });
}
