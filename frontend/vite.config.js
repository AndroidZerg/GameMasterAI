import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { execSync } from 'child_process'

function getCommitHash() {
  const envHash = process.env.CF_PAGES_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || '';
  if (envHash) return envHash.slice(0, 7);
  try { return execSync('git rev-parse --short HEAD').toString().trim(); } catch { return 'unknown'; }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    '__COMMIT_HASH__': JSON.stringify(getCommitHash()),
  },
  server: {
    port: 3100,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        landing: resolve(__dirname, 'landing.html'),
      },
    },
  },
})
