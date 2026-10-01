import { existsSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

// Locally the test database URLs come from the root .env (never .env.production); CI sets them.
const envFile = new URL('../../.env', import.meta.url);
if (existsSync(envFile)) process.loadEnvFile(envFile);

export default defineConfig({
  test: {
    // Rebuilds the test database from empty once per run.
    globalSetup: ['./src/db/test-global-setup.ts'],
    // Database test files share one database, so files run one at a time.
    fileParallelism: false,
    hookTimeout: 120_000,
    testTimeout: 30_000,
  },
});
