import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('is the outlined default button with type="button"', () => {
    render(<Button>Hold order</Button>);
    const button = screen.getByRole('button', { name: 'Hold order' });

    expect(button).toHaveAttribute('class', 'bp-btn');
    expect(button).toHaveAttribute('type', 'button');
  });

  it.each(['primary', 'quiet', 'danger'] as const)('sets the %s variant class', (variant) => {
    render(<Button variant={variant}>Void sale</Button>);
    expect(screen.getByRole('button')).toHaveClass('bp-btn', `bp-btn--${variant}`);
  });

  it('sets the size and block classes', () => {
    render(
      <>
        <Button size="lg" block>
          Pay
        </Button>
        <Button size="sm">Edit product</Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'Pay' })).toHaveClass('bp-btn--lg', 'bp-btn--block');
    expect(screen.getByRole('button', { name: 'Edit product' })).toHaveClass('bp-btn--sm');
  });

  it('shows a leading icon', () => {
    const { container } = render(<Button icon="trash">Void sale</Button>);
    expect(container.querySelector('svg.bp-icon')).toBeInTheDocument();
  });

  it('does not fire when disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Close register
      </Button>,
    );
    await userEvent.click(screen.getByRole('button'));

    expect(screen.getByRole('button')).toBeDisabled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('keeps the label, spins the refresh icon, sets aria-busy and ignores clicks while loading', async () => {
    const onClick = vi.fn();
    const { container } = render(
      <Button variant="primary" icon="check" loading onClick={onClick}>
        Saving sale
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Saving sale' });
    await userEvent.click(button);

    expect(button).toHaveClass('is-loading');
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(container.querySelectorAll('svg')).toHaveLength(1);
    expect(container.querySelector('path')).toHaveAttribute('d', 'M20 11a8 8 0 0 0-14.5-4M4 4v4h4');
    expect(onClick).not.toHaveBeenCalled();
  });

  it('fires onClick when ready', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Add to order</Button>);
    await userEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByRole('button')).not.toHaveAttribute('aria-busy');
  });
});
