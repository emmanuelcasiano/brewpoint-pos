import { appConfig } from '@brewpoint/config/vite';
import { mergeConfig } from 'vite';

const here = import.meta.dirname;

// Dev-only component gallery. The design system's standalone previews are served as static files,
// so each section can show /<Name>.html beside the React component.
export default mergeConfig(appConfig({ port: 5176 }), {
  root: here,
  publicDir: `${here}/../../../docs/design-system/previews`,
  build: { outDir: `${here}/../dist`, emptyOutDir: true },
});
