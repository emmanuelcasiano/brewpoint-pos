import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card } from './Card';

describe('Card', () => {
  it('heads its content with the title and meta', () => {
    const { container } = render(
      <Card
        title="Sales by hour"
        meta="Today, 7 AM to 7 PM"
        foot={<a href="/reports">View report</a>}
      >
        <p>Chart</p>
      </Card>,
    );

    expect(screen.getByRole('heading', { level: 3, name: 'Sales by hour' })).toHaveClass(
      'bp-card__title',
    );
    expect(container.querySelector('.bp-card__meta')).toHaveTextContent('Today, 7 AM to 7 PM');
    expect(container.querySelector('.bp-card__foot')).toHaveTextContent('View report');
  });

  it('takes a heading level and leaves out the meta and foot when not given', () => {
    const { container } = render(
      <Card title="Usage" as="h2">
        <p>Meters</p>
      </Card>,
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Usage' })).toBeInTheDocument();
    expect(container.querySelector('.bp-card__meta')).toBeNull();
    expect(container.querySelector('.bp-card__foot')).toBeNull();
  });
});
