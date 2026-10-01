import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main.ts'],
  format: ['esm'],
  target: 'node22',
  clean: true,
  // Workspace packages ship TypeScript source, so they are bundled into the server build.
  noExternal: [/^@brewpoint\//],
});
