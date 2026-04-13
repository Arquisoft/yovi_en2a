import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/**/*.tsx', 'src/**/*.ts'],
      exclude: ['src/main.tsx', 'src/**/*.d.ts', 'src/vite-env.d.ts'],
    },
  },
})