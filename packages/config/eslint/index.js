import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

/**
 * Lint rules shared by every package. Type-aware rules read the package's own tsconfig.
 * @param {string} tsconfigRootDir the package folder, usually import.meta.dirname
 */
export function base(tsconfigRootDir) {
  return defineConfig(
    { ignores: ['dist/**', 'coverage/**'] },
    js.configs.recommended,
    tseslint.configs.recommendedTypeChecked,
    {
      languageOptions: {
        parserOptions: { projectService: true, tsconfigRootDir },
      },
    },
    { files: ['**/*.js'], extends: [tseslint.configs.disableTypeChecked] },
    prettier,
  );
}

/**
 * The base rules plus React hooks and fast-refresh rules, for the Vite apps.
 * @param {string} tsconfigRootDir the package folder, usually import.meta.dirname
 */
export function react(tsconfigRootDir) {
  return defineConfig(
    base(tsconfigRootDir),
    reactHooks.configs.flat.recommended,
    reactRefresh.configs.vite,
  );
}
