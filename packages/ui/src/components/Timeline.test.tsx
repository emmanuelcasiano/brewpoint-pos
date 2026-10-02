import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Timeline } from './Timeline';

describe('Timeline', () => {
  it('marks done steps, the current step and what is still to come', () => {
    render(
      <Timeline
        steps={[
          { key: 'created', state: 'done', content: <b>Created</b> },
          { key: 'arriving', state: 'now', content: <b>Arriving today</b> },
          { key: 'received', state: 'upcoming', content: <b>Received</b> },
        ]}
      />,
    );
    const [created, arriving, received] = screen.getAllByRole('listitem');

    expect(screen.getByRole('list')).toHaveClass('bp-timeline');
    expect(created).toHaveClass('is-done');
    expect(created).toHaveTextContent('Done: Created');
    expect(arriving).toHaveClass('is-now');
    expect(arriving).toHaveAttribute('aria-current', 'step');
    expect(arriving).toHaveTextContent(/^Arriving today$/);
    expect(received).not.toHaveAttribute('class');
    expect(received).not.toHaveAttribute('aria-current');
    expect(received).toHaveTextContent('Not yet: Received');
  });
});
