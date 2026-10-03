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
    // The screen tests type whole emails and passwords key by key; when every package tests at
    // once (the server suite included) one can pass the default 5 seconds.
    testTimeout: 15_000,
  },
});
