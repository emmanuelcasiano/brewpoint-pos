import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { IconButton } from './IconButton';

describe('IconButton', () => {
  it('is named by its label and shows a decorative icon', async () => {
    const onClick = vi.fn();
    const { container } = render(<IconButton icon="x" label="Close" onClick={onClick} />);
    const button = screen.getByRole('button', { name: 'Close' });
    await userEvent.click(button);

    expect(button).toHaveClass('bp-iconbtn');
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('can be disabled', () => {
    render(<IconButton icon="edit" label="Edit supplier" disabled />);
    expect(screen.getByRole('button', { name: 'Edit supplier' })).toBeDisabled();
  });
});
