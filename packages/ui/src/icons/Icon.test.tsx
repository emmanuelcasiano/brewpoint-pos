import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { loadReferenceBundle } from '../test/design-system';
import { Icon } from './Icon';
import { ICON_NAMES, ICON_PATHS } from './icon-paths';

describe('Icon', () => {
  it('has the same names and paths as bundle.js', () => {
    const reference = loadReferenceBundle();

    expect(ICON_NAMES).toEqual(reference.icons);
    for (const name of ICON_NAMES) {
      const paths = [...reference.icon(name).matchAll(/ d="([^"]+)"/g)].map((m) => m[1]);
      expect(paths, name).toEqual([...ICON_PATHS[name]]);
    }
  });

  it('renders a decorative 20px icon by default', () => {
    const { container } = render(<Icon name="check" />);
    const svg = container.querySelector('svg');

    expect(svg).toHaveClass('bp-icon');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('width', '20');
  });

  it('takes a size and extra classes', () => {
    const { container } = render(<Icon name="refresh" size={16} className="is-spin" />);
    const svg = container.querySelector('svg');

    expect(svg).toHaveClass('bp-icon', 'is-spin');
    expect(svg).toHaveAttribute('height', '16');
  });
});
