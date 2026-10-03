import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

function shortCommit() {
  if (process.env.GITHUB_SHA) {
    return process.env.GITHUB_SHA.slice(0, 7);
  }
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'dev';
  }
}

/**
 * Vite settings shared by the back-office, POS and console apps.
 * Vite runs from the app's folder (pnpm and Turborepo do this), so its package.json gives the version.
 * @param {{ port: number, envPrefix?: string }} options the app's port, used for both dev and
 *   preview; envPrefix exposes the root .env variables starting with it to this app's code (the
 *   POS uses DEMO_DEVICE_ until Module 06). Nothing else in .env reaches the browser.
 */
export function appConfig({ port, envPrefix }) {
  const { version } = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
  // The apps call the server at /api on their own address, so sign-in cookies (SameSite=Strict,
  // Path=/api) belong to the app's origin. Vite passes /api through to the local server.
  const proxy = { '/api': `http://127.0.0.1:${process.env.SERVER_PORT ?? '3000'}` };

  return defineConfig({
    plugins: [react(), tailwindcss()],
    define: {
      __APP_VERSION__: JSON.stringify(version),
      __APP_COMMIT__: JSON.stringify(shortCommit()),
    },
    envDir: join(import.meta.dirname, '../../..'),
    envPrefix: envPrefix ? ['VITE_', envPrefix] : 'VITE_',
    server: { host: '127.0.0.1', port, strictPort: true, proxy },
    preview: { host: '127.0.0.1', port, strictPort: true, proxy },
  });
}
