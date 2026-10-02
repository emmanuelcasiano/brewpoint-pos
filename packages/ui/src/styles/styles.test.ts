import { describe, expect, it } from 'vitest';
import { readDesignSystem, readStyles, readTokens } from '../test/design-system';

const tokens = readTokens();
const theme = readStyles('theme.css');

describe('ported styles', () => {
  it('keeps tokens.css identical to the design system', () => {
    expect(readStyles('tokens.css')).toBe(readDesignSystem('tokens.css'));
  });

  it('keeps components.css as bundle.css inside the components layer, minus the font import', () => {
    const bundle = readDesignSystem('components/bundle.css').split('\n');
    expect(bundle[0]).toMatch(/^@import url\("https:\/\/fonts\.googleapis\.com/);

    const ported = readStyles('components.css');
    const body = ported.slice(
      ported.indexOf('@layer components {\n') + 20,
      ported.lastIndexOf('}'),
    );
    const unindented = body
      .split('\n')
      .map((line) => line.replace(/^ {2}/, ''))
      .join('\n');

    expect(unindented.trimEnd()).toBe(bundle.slice(1).join('\n').trimEnd());
  });
});

describe('theme.css', () => {
  it('maps every color token to a Tailwind color', () => {
    for (const { name } of tokens.color.tokens) {
      expect(theme, name).toContain(`--color-${name}: var(--${name});`);
    }
  });

  it('copies every type style from tokens.json', () => {
    for (const group of tokens.type.groups) {
      for (const style of group.styles) {
        const prefix = `--text-${style.name}`;
        expect(theme, style.name).toContain(`${prefix}: ${style.fontSize};`);
        expect(theme, style.name).toContain(`${prefix}--line-height: ${style.lineHeight};`);
        expect(theme, style.name).toContain(`${prefix}--font-weight: ${style.fontWeight};`);
        if (style.letterSpacing) {
          expect(theme, style.name).toContain(`${prefix}--letter-spacing: ${style.letterSpacing};`);
        }
      }
    }
  });
});
