import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const SRC = join(import.meta.dirname, '..');

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((file) => /\.(tsx?|css)$/.test(file) && !/\.test\.tsx?$/.test(file))
    .map((file) => join(dir, file));
}

// CLAUDE.md: use the tokens, never hex values, in components. tokens.css is where hex lives.
describe('no hex colors in components', () => {
  const files = [
    ...filesUnder(join(SRC, 'components')),
    ...filesUnder(join(SRC, 'icons')),
    join(SRC, 'styles/components.css'),
    join(SRC, 'styles/compat.css'),
    join(SRC, 'styles/theme.css'),
  ];

  it.each(files)('%s has no hex color', (file) => {
    expect(readFileSync(file, 'utf8').match(HEX) ?? []).toEqual([]);
  });
});
