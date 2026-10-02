import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Meter } from './Meter';

describe('Meter', () => {
  it('shows usage in words and fills to the share of the limit', () => {
    const { container } = render(<Meter label="Devices" value={2} limit={3} />);
    const meter = screen.getByRole('meter', { name: 'Devices' });

    expect(container.querySelector('.bp-meter__head')).toHaveTextContent('Devices2 of 3');
    expect(meter).toHaveClass('bp-meter__track');
    expect(meter).toHaveAttribute('aria-valuenow', '2');
    expect(meter).toHaveAttribute('aria-valuemax', '3');
    expect(meter).toHaveAttribute('aria-valuetext', '2 of 3');
    expect(container.querySelector<HTMLElement>('.bp-meter__fill')?.style.width).toBe('67%');
    expect(container.querySelector('.bp-meter')).not.toHaveClass('bp-meter--warning');
  });

  it('turns warning at 90% of the limit', () => {
    const { container, rerender } = render(<Meter label="Users" value={8} limit={10} />);
    expect(container.querySelector('.bp-meter')).not.toHaveClass('bp-meter--warning');

    rerender(<Meter label="Users" value={9} limit={10} />);
    expect(container.querySelector('.bp-meter')).toHaveClass('bp-meter--warning');
  });

  it('caps the fill at a full track when over the limit', () => {
    const { container } = render(<Meter label="Users" value={12} limit={10} />);

    expect(container.querySelector<HTMLElement>('.bp-meter__fill')?.style.width).toBe('100%');
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuetext', '12 of 10');
  });

  it('reads "of unlimited" with an empty track and no meter role', () => {
    const { container } = render(<Meter label="Products" value={1204} limit={null} />);

    expect(container.querySelector('.bp-meter__head b')).toHaveTextContent('1,204 of unlimited');
    expect(container.querySelector<HTMLElement>('.bp-meter__fill')?.style.width).toBe('0%');
    expect(screen.queryByRole('meter')).toBeNull();
    expect(container.querySelector('.bp-meter')).not.toHaveClass('bp-meter--warning');
  });
});
