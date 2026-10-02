import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { loadReferenceBundle } from '../test/design-system';
import { Sparkline } from './Sparkline';
import { StatTile } from './StatTile';

const SPARK = [3842, 3615, 4098, 4521, 5176, 4833, 4294];

describe('StatTile', () => {
  it('states the delta with an arrow, the word and the comparison', () => {
    const { container } = render(
      <StatTile
        label="Net sales today"
        value="₱42,940.00"
        delta={{ direction: 'up', amount: '7.0%', comparison: 'vs last Monday', tone: 'good' }}
        spark={SPARK}
      />,
    );
    const delta = container.querySelector('.bp-stat__delta');

    expect(container.querySelector('.bp-stat__label')).toHaveTextContent('Net sales today');
    expect(container.querySelector('.bp-stat__value')).toHaveTextContent('₱42,940.00');
    expect(delta).toHaveClass('bp-stat__delta--good');
    expect(delta).toHaveTextContent('Up 7.0% vs last Monday');
    expect(delta?.querySelector('span')).toHaveTextContent('vs last Monday');
    expect(delta?.querySelector('.bp-icon path')).toHaveAttribute('d', 'M12 19V5');
    expect(container.querySelector('.bp-stat__row [data-spark] .bp-spark')).not.toBeNull();
  });

  it('stays neutral without a tone and says "Down" with the down arrow', () => {
    const { container } = render(
      <StatTile
        label="Average order"
        value="₱137.63"
        delta={{ direction: 'down', amount: '2.6%', comparison: 'vs last Monday' }}
      />,
    );
    const delta = container.querySelector('.bp-stat__delta');

    expect(delta).toHaveAttribute('class', 'bp-stat__delta');
    expect(delta).toHaveTextContent('Down 2.6% vs last Monday');
    expect(delta?.querySelector('.bp-icon path')).toHaveAttribute('d', 'M12 5v14');
  });

  it('drops the delta line when there is nothing to compare with', () => {
    const { container } = render(<StatTile label="Net sales today" value="₱1,245.00" />);
    expect(container.querySelector('.bp-stat__delta')).toBeNull();
  });

  it('shows placeholder blocks while loading', () => {
    const { container } = render(
      <StatTile label="Gross margin" value="₱8,120.00" spark={SPARK} loading />,
    );
    const tile = container.querySelector('.bp-stat');

    expect(tile).toHaveClass('is-loading');
    expect(tile).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelector('.bp-stat__value')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.queryByText('₱8,120.00')).toBeNull();
    expect(screen.getByText('Loading comparison')).toHaveClass('bp-stat__delta');
    expect(container.querySelector('.bp-spark')).toBeNull();
  });
});

describe('Sparkline', () => {
  it('draws the same line as bundle.js, hidden from screen readers', () => {
    const { container } = render(<Sparkline values={SPARK} color="chart-3" />);
    const ref = document.createElement('div');
    ref.innerHTML = loadReferenceBundle().sparkline(SPARK, 'chart-3');
    const svg = container.querySelector('svg.bp-spark');

    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg?.querySelector('path')).toHaveAttribute(
      'd',
      ref.querySelector('path')?.getAttribute('d'),
    );
    expect(svg?.querySelector('path')).toHaveAttribute('stroke', 'var(--chart-3)');
    expect(svg?.querySelector('circle')).toHaveAttribute(
      'cx',
      ref.querySelector('circle')?.getAttribute('cx'),
    );
  });

  it('draws nothing with fewer than two points', () => {
    const { container } = render(<Sparkline values={[4294]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
