import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('toggles from its text, which shares the label', async () => {
    render(<Checkbox label="Skip expired containers" />);
    const box = screen.getByRole('checkbox', { name: 'Skip expired containers' });
    await userEvent.click(screen.getByText('Skip expired containers'));

    expect(box).toHaveClass('bp-check');
    expect(box).toBeChecked();
  });

  it('can be disabled while checked', async () => {
    render(<Checkbox label="Back-office alerts" defaultChecked disabled />);
    const box = screen.getByRole('checkbox');
    await userEvent.click(box);

    expect(box).toBeDisabled();
    expect(box).toBeChecked();
  });
});
