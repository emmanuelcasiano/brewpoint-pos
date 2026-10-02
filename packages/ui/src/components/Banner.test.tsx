import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Banner } from './Banner';

describe('Banner', () => {
  it('is an info status with the title sentence first', () => {
    render(<Banner title="Your trial ends in 9 days.">Add a plan to keep selling.</Banner>);
    const banner = screen.getByRole('status');

    expect(banner).toHaveAttribute('class', 'bp-banner');
    expect(banner).toHaveTextContent('Your trial ends in 9 days. Add a plan to keep selling.');
    expect(banner.querySelector('.bp-banner__title')).toHaveTextContent(
      'Your trial ends in 9 days.',
    );
  });

  it('shows offline as a neutral status with the wifi-off icon', () => {
    const { container } = render(
      <Banner tone="offline" title="You are offline.">
        Sales are saved on this device.
      </Banner>,
    );
    const banner = screen.getByRole('status');

    expect(banner).toHaveClass('bp-banner--offline');
    expect(container.querySelector('.bp-banner__icon path')).toHaveAttribute('d', 'M3 3l18 18');
  });

  it('makes a blocking banner an alert', () => {
    render(<Banner tone="danger" title="Selling is paused." />);
    expect(screen.getByRole('alert')).toHaveClass('bp-banner', 'bp-banner--danger');
  });

  it('offers one small action', async () => {
    const onClick = vi.fn();
    render(
      <Banner
        tone="warning"
        icon="clock"
        title="Offline license ends in 2 days."
        action={{ label: 'Sync now', onClick }}
      />,
    );
    const button = screen.getByRole('button', { name: 'Sync now' });
    await userEvent.click(button);

    expect(button).toHaveClass('bp-btn', 'bp-btn--sm');
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(onClick).toHaveBeenCalledOnce();
  });
});
