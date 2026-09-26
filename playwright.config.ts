import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  // I test e2e condividono la stessa camera di prova sul progetto reale:
  // in parallelo i messaggi di un test finirebbero in mezzo a quelli di un altro.
  workers: 1,
  webServer: {
    // npx invece di pnpm: pnpm si blocca per il workspace in C:\Users\mandr (vedi PLAN.md).
    command: 'npx vite --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
  use: {
    baseURL: 'http://localhost:5173',
  },
})
