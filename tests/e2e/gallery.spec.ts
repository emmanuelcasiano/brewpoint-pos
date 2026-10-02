import { existsSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const GALLERY = 'http://127.0.0.1:5176';
const THEMES = ['light', 'dark'] as const;

// ACCENT_VARIABLES in packages/ui/src/accent/apply-accent.ts: all a shop accent may change.
const ACCENT_VARIABLES = [
  '--accent',
  '--accent-hover',
  '--accent-pressed',
  '--on-accent',
  '--accent-soft',
  '--accent-strong',
];

async function openGallery(page: Page) {
  await page.goto(GALLERY);
  await page.evaluate(() => document.fonts.ready);
}

async function sectionIds(page: Page): Promise<string[]> {
  return page
    .locator('[data-section]')
    .evaluateAll((sections) => sections.map((s) => s.getAttribute('data-section') ?? ''));
}

/** Every token variable's computed value on each theme column of the first section. */
async function tokenValues(page: Page) {
  return page.locator('[data-specimen]').evaluateAll((columns) =>
    columns.slice(0, 2).map((column) => {
      const style = getComputedStyle(column);
      const values: Record<string, string> = {};
      for (const name of Array.from(style)) {
        if (name.startsWith('--')) values[name] = style.getPropertyValue(name).trim();
      }
      return values;
    }),
  );
}

test.describe('component gallery', () => {
  test('a shop accent of #9C3D54 changes only the accent tokens', async ({ page }) => {
    await openGallery(page);
    const before = await tokenValues(page);

    await page.getByLabel('Shop accent').fill('#9C3D54');
    await expect(page.locator('[data-specimen="light"]').first()).toHaveAttribute(
      'style',
      /--accent:/,
    );
    const after = await tokenValues(page);

    for (const [i, values] of after.entries()) {
      const changed = Object.keys(values).filter((name) => values[name] !== before[i]?.[name]);
      expect(Object.keys(values).length).toBeGreaterThan(50);
      expect(changed.sort()).toEqual([...ACCENT_VARIABLES].sort());
    }
  });

  test('every interactive component shows a 2px focus ring with a 2px gap', async ({ page }) => {
    test.slow();
    await openGallery(page);
    // The preview iframes have their own focus order; only the React columns are checked here.
    await page.evaluate(() => document.querySelectorAll('iframe').forEach((f) => f.remove()));
    const visited: string[] = [];
    const failures: string[] = [];

    for (let step = 0; step < 3000; step += 1) {
      await page.keyboard.press('Tab');
      const focus = await page.evaluate(() => {
        const el = document.activeElement;
        // Focus left the page, or wrapped round to an element already checked.
        if (!(el instanceof HTMLElement) || el === document.body) return null;
        if (el.hasAttribute('data-focus-checked')) return null;
        el.setAttribute('data-focus-checked', '');
        const column = el.closest('[data-specimen]');
        const section = el.closest('[data-section]')?.getAttribute('data-section');
        if (!column || !section) return { inSpecimen: false };
        const ring = getComputedStyle(el);
        const probe = document.createElement('span');
        el.parentElement?.append(probe);
        const color = (token: string) => {
          probe.style.color = `var(${token})`;
          return getComputedStyle(probe).color;
        };
        const allowed = [color('--focus'), color('--focus-inverse')];
        probe.remove();
        const name = (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40);
        const theme = column.getAttribute('data-specimen');
        const label = `${section} (${theme}): ${el.tagName.toLowerCase()} "${name}"`;
        return {
          inSpecimen: true,
          label,
          ok:
            ring.outlineStyle === 'solid' &&
            ring.outlineWidth === '2px' &&
            ['2px', '-2px'].includes(ring.outlineOffset) &&
            allowed.includes(ring.outlineColor),
          ring: `${ring.outlineStyle} ${ring.outlineWidth} offset ${ring.outlineOffset} ${ring.outlineColor}`,
        };
      });
      if (!focus) break;
      if (!focus.label) continue;
      visited.push(focus.label);
      if (!focus.ok) failures.push(`${focus.label}: ${focus.ring}`);
    }

    expect(failures).toEqual([]);
    expect(visited.length).toBeGreaterThan(100);
  });

  // Pixel baselines are Linux Chromium only; they come from the manual update-gallery-snapshots
  // CI job. Until a section's baseline is committed, its screenshot is skipped, not failed.
  test.describe('screenshots', () => {
    test.skip(process.platform !== 'linux', 'Gallery baselines are Linux Chromium only');

    test('every section matches its baseline in both themes', async ({ page }, testInfo) => {
      test.slow();
      await page.setViewportSize({ width: 1800, height: 1000 });
      await openGallery(page);
      const updating = testInfo.config.updateSnapshots === 'all';

      for (const id of await sectionIds(page)) {
        for (const theme of THEMES) {
          const name = `${id}-${theme}.png`;
          if (!updating && !existsSync(testInfo.snapshotPath(name))) {
            testInfo.annotations.push({ type: 'skipped', description: `No baseline for ${name}` });
            continue;
          }
          const column = page.locator(`[data-section="${id}"] [data-specimen="${theme}"]`);
          await column.scrollIntoViewIfNeeded();
          await expect.soft(column).toHaveScreenshot(name);
        }
      }
    });
  });
});
