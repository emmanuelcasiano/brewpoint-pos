import { base } from '@brewpoint/config/eslint';

// Lints the root files only (tests/e2e and playwright.config.ts); each package has its own config.
export default base(import.meta.dirname);
