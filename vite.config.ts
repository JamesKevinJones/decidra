import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { challengeApi } from './server/challenge-api.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // The '' prefix loads every variable from .env.local into this Node process
  // only. Vite exposes just VITE_-prefixed ones to the browser, so the key never
  // reaches it.
  const env = loadEnv(mode, process.cwd(), '')
  // Off unless asked for: no live Claude calls, and no cost, by default.
  const aiMode = env.DECIDRA_AI === 'live' ? 'live' : 'mock'

  return {
    plugins: [react(), challengeApi(aiMode, env.ANTHROPIC_API_KEY || undefined)],
    define: { __DECIDRA_AI_MODE__: JSON.stringify(aiMode) },
  }
})
