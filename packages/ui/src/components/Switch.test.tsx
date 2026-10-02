import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Switch } from './Switch';

describe('Switch', () => {
  it('is a named switch that turns on and off', async () => {
    render(<Switch label="Expiring soon, push" />);
    const control = screen.getByRole('switch', { name: 'Expiring soon, push' });

    expect(control).toHaveClass('bp-switch');
    expect(control).not.toBeChecked();
    await userEvent.click(control);
    expect(control).toBeChecked();
    await userEvent.click(control);
    expect(control).not.toBeChecked();
  });

  it('stays on when locked', async () => {
    render(<Switch label="Out of stock, back-office" defaultChecked disabled />);
    const control = screen.getByRole('switch');
    await userEvent.click(control);

    expect(control).toBeDisabled();
    expect(control).toBeChecked();
  });
});
