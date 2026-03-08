import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const fiiApiProxyTarget = env.VITE_FII_API_PROXY_TARGET || 'http://127.0.0.1:8000'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api/fii': {
          target: fiiApiProxyTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/fii/, '/fii'),
        },
      },
    },
  }
})
