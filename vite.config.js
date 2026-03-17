import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite"

function buildProxyTokenValue(env) {
  const token = String(env.FII_API_TOKEN ?? '').trim()
  const prefix = String(env.FII_API_TOKEN_PREFIX ?? 'Bearer').trim()

  if (!token) return ''
  if (!prefix) return token
  return `${prefix} ${token}`
}

function buildProxyHeaders(env) {
  const headers = {
    Accept: 'application/json',
  }

  const tokenHeader = String(env.FII_API_TOKEN_HEADER ?? 'Authorization').trim()
  const tokenValue = buildProxyTokenValue(env)
  if (tokenHeader && tokenValue) {
    headers[tokenHeader] = tokenValue
  }

  return headers
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const fiiApiProxyTarget = env.FII_API_PROXY_TARGET || env.VITE_FII_API_PROXY_TARGET || 'http://127.0.0.1:8000'
  const proxyHeaders = buildProxyHeaders(env)

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: true,
      proxy: {
        '/api/fii': {
          target: fiiApiProxyTarget,
          changeOrigin: true,
          headers: proxyHeaders,
          rewrite: (path) => path.replace(/^\/api\/fii/, '/fii'),
        },
        '/api/dividendos': {
          target: fiiApiProxyTarget,
          changeOrigin: true,
          headers: proxyHeaders,
          rewrite: (path) => path.replace(/^\/api\/dividendos/, '/dividendos'),
        },
      },
    },
  }
})
