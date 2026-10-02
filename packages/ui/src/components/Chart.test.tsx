import { formatPeso } from '@brewpoint/shared';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { loadReferenceBundle } from '../test/design-system';
import { Chart, type ChartProps } from './Chart';

const HOURS = ['7 AM', '8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM'];
const HOURLY = [185000, 420000, 512000, 368000, 290000, 455000, 398000];

const BAR: ChartProps = {
  type: 'bar',
  title: 'Sales by hour',
  labels: HOURS,
  format: 'peso',
  series: [{ name: 'Net sales', values: HOURLY }],
  labelHeading: 'Hour',
  emptyText: 'No sales yet today. Sales appear here as they sync.',
};

const LINE: ChartProps = {
  ...BAR,
  type: 'line',
  title: 'Net sales, last 7 days',
  labels: ['Tue 22', 'Wed 23', 'Thu 24', 'Fri 25', 'Sat 26', 'Sun 27', 'Mon 28'],
  labelHeading: 'Day',
  series: [
    { name: 'This week', values: [3842000, 3615000, 4098000, 4521000, 5176000, 4833000, 4294000] },
    {
      name: 'Week before',
      compare: true,
      values: [3590000, 3702000, 3911000, 4130000, 4788000, 4605000, 4012000],
    },
  ],
};

const HBAR: ChartProps = {
  type: 'hbar',
  title: 'Top products today',
  labels: ['Iced Latte', 'Spanish Latte', 'Americano'],
  format: 'count',
  series: [{ name: 'Sold', values: [64, 51, 38] }],
  labelHeading: 'Product',
  emptyText: 'No sales yet today.',
};

/** The same spec drawn by the design system's bundle.js, at the same 560px width. */
function reference(props: ChartProps): HTMLElement {
  const el = document.createElement('div');
  loadReferenceBundle().chart(el, { ...props });
  return el;
}

function attrs(root: ParentNode, selector: string, name: string): (string | null)[] {
  return [...root.querySelectorAll(selector)].map((node) => node.getAttribute(name));
}

function texts(root: ParentNode, selector: string): string[] {
  return [...root.querySelectorAll(selector)].map((node) => node.textContent ?? '');
}

describe('Chart', () => {
  it('draws bars with the same geometry and axis labels as bundle.js', () => {
    const { container } = render(<Chart {...BAR} />);
    const ref = reference(BAR);

    expect(container.querySelector('.bp-chart')).not.toBeNull();
    expect(screen.getByRole('img', { name: 'Sales by hour' })).toHaveClass('bp-chart__svg');
    expect(attrs(container, '.bp-chart__mark', 'd')).toEqual(attrs(ref, '.bp-chart__mark', 'd'));
    expect(texts(container, '.bp-chart__axis')).toEqual(texts(ref, '.bp-chart__axis'));
    expect(texts(container, '.bp-chart__axis')).toContain('₱6k');
    expect(attrs(container, 'rect.bp-chart__hit', 'x')).toEqual(
      attrs(ref, 'rect.bp-chart__hit', 'x'),
    );
  });

  it('draws a line chart with a dashed comparison and a legend, as bundle.js does', () => {
    const { container } = render(<Chart {...LINE} />);
    const ref = reference(LINE);
    const lines = (root: ParentNode) => attrs(root, 'path[fill="none"]', 'd');

    expect(lines(container)).toEqual(lines(ref));
    expect(attrs(container, '.bp-chart__dot', 'cy')).toEqual(attrs(ref, '.bp-chart__dot', 'cy'));
    expect(container.querySelector('path[stroke-dasharray="6 5"]')).toHaveAttribute(
      'stroke',
      'var(--chart-compare)',
    );
    expect(texts(container, '.bp-legend__item')).toEqual(['This week', 'Week before']);
    expect(container.querySelectorAll('.bp-legend__key.is-dashed')).toHaveLength(1);
  });

  it('prints every hbar value at the end of its row, with no tooltip', () => {
    const { container } = render(<Chart {...HBAR} />);
    const ref = reference(HBAR);

    expect(attrs(container, 'g.bp-chart__hit path', 'd')).toEqual(
      attrs(ref, 'g.bp-chart__hit path', 'd'),
    );
    expect(texts(container, '.bp-chart__value')).toEqual(['64', '51', '38']);
    expect(texts(container, '.bp-chart__label')).toEqual(HBAR.labels);
    expect(container.querySelector('.bp-tip')).toBeNull();
  });

  it('shows the hovered bucket in the tooltip with full pesos and dims the other bars', async () => {
    const { container } = render(<Chart {...BAR} />);
    const tip = screen.getByRole('tooltip', { hidden: true });
    expect(tip).not.toBeVisible();

    await userEvent.hover(container.querySelectorAll('rect.bp-chart__hit')[2]!);

    expect(tip).toBeVisible();
    expect(tip.querySelector('.bp-tip__title')).toHaveTextContent('9 AM');
    expect(tip.querySelector('.bp-tip__row')).toHaveTextContent(`Net sales${formatPeso(512000)}`);
    expect(container.querySelectorAll('.bp-chart__mark.is-dim')).toHaveLength(HOURS.length - 1);
    expect(container.querySelector('.bp-chart__mark[data-i="2"]')).not.toHaveClass('is-dim');

    await userEvent.unhover(container.querySelector('svg')!);
    expect(tip).not.toBeVisible();
    expect(container.querySelector('.is-dim')).toBeNull();
  });

  it('moves the crosshair to the hovered day and shows its dots on a line chart', async () => {
    const { container } = render(<Chart {...LINE} />);
    await userEvent.hover(container.querySelectorAll('rect.bp-chart__hit')[4]!);

    const cross = container.querySelector('.bp-chart__cross');
    expect(cross).toHaveClass('is-on');
    expect(cross?.getAttribute('x1')).toBe(
      container.querySelector('.bp-chart__dot[data-i="4"]')?.getAttribute('cx'),
    );
    expect(container.querySelectorAll('.bp-chart__dot.is-on')).toHaveLength(2);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Sat 26');
  });

  it('draws one series without a legend', () => {
    const { container } = render(<Chart {...BAR} />);
    expect(container.querySelector('.bp-legend')).toBeNull();
  });

  it('always has a table view with the same numbers', () => {
    render(<Chart {...LINE} />);
    const table = screen.getByRole('table', { name: 'Net sales, last 7 days' });

    expect(screen.getByText('Show as table').closest('details')).toHaveClass('bp-tableview');
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['Day', 'This week', 'Week before']);
    expect(within(table).getAllByRole('row')[1]).toHaveTextContent(
      `Tue 22${formatPeso(3842000)}${formatPeso(3590000)}`,
    );
  });

  it('shows a sentence instead of an empty axis', () => {
    const { container } = render(
      <Chart {...BAR} series={[{ name: 'Net sales', values: HOURS.map(() => 0) }]} />,
    );

    expect(screen.getByText(BAR.emptyText)).toHaveClass('bp-note');
    expect(container.querySelector('svg')).toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('colors series with chart-1 to chart-4 and chart-compare only', () => {
    const { container } = render(
      <>
        <Chart {...LINE} />
        <Chart {...BAR} type="bar" series={LINE.series} />
        <Chart {...HBAR} />
      </>,
    );
    const paints = new Set([
      ...attrs(container, '[fill]', 'fill'),
      ...attrs(container, '[stroke]', 'stroke'),
      ...[...container.querySelectorAll<HTMLElement>('.bp-legend__key')].map((key) =>
        key.style.getPropertyValue('--key'),
      ),
    ]);
    const allowed =
      /^(none|transparent|var\(--(chart-[1-4]|chart-compare|chart-grid|surface-raised|surface-sunken|ink-muted)\))$/;

    expect([...paints].filter((paint) => !allowed.test(paint ?? ''))).toEqual([]);
  });
});
