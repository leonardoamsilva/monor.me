import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  Object.assign(process.env, env)
  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api/brapi': {
          target: 'https://brapi.dev',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/brapi/, '/api'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              const key = process.env.VITE_BRAPI_KEY || ''
              if (key) proxyReq.setHeader('Authorization', 'Bearer ' + key)
            })
          },
        },
      },
    },
  }
})
