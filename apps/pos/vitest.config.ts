import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify('test'),
    __APP_COMMIT__: JSON.stringify('test'),
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
    // Each PIN check is a real Argon2id verify (19 MiB), slow by design; a test that tries
    // several PINs needs more than the default 5 seconds when every package tests at once.
    testTimeout: 20_000,
  },
});
