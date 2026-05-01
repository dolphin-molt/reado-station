import { defineConfig } from 'vitest/config'

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      '@': new URL('./apps/web/src', import.meta.url).pathname,
    },
  },
  test: {
    include: ['scripts/**/*.test.ts', 'apps/web/src/**/*.test.ts'],
    globals: true,
  },
})
