import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Resolves the `@/*` alias (repository root) from tsconfig.json.
    tsconfigPaths: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/utils/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
  },
})
