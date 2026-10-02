import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import { Drawer } from './Drawer';
import { Split } from './Split';

describe('Split', () => {
  it('uses the 376px column, or the 420px one when wide', () => {
    const { container, rerender } = render(<Split>table</Split>);
    expect(container.firstElementChild).toHaveAttribute('class', 'bp-split');

    rerender(<Split wide>table</Split>);
    expect(container.firstElementChild).toHaveClass('bp-split', 'bp-split--wide');
  });
});

describe('Drawer', () => {
  it('is a complementary region named by its title, with the meta line', () => {
    render(
      <Drawer title="Fresh milk" meta="1 L box. Ingredient in 9 products">
        Stock settings
      </Drawer>,
    );
    const drawer = screen.getByRole('complementary', { name: 'Fresh milk' });

    expect(drawer).toHaveClass('bp-drawer');
    expect(screen.getByRole('heading', { name: 'Fresh milk' })).toHaveClass('bp-card__title');
    expect(drawer).toHaveTextContent('1 L box. Ingredient in 9 products');
    expect(drawer.querySelector('.bp-drawer__body')).toHaveTextContent('Stock settings');
  });

  it('shows the close button only when it can close', async () => {
    const onClose = vi.fn();
    const { rerender } = render(<Drawer title="Fresh milk">Body</Drawer>);
    expect(screen.queryByRole('button', { name: 'Close' })).not.toBeInTheDocument();

    rerender(
      <Drawer title="Fresh milk" onClose={onClose}>
        Body
      </Drawer>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('puts the actions in the footer, and has no footer without them', () => {
    const { container, rerender } = render(<Drawer title="Fresh milk">Body</Drawer>);
    expect(container.querySelector('.bp-drawer__foot')).toBeNull();

    rerender(
      <Drawer
        title="Fresh milk"
        footer={
          <>
            <Button size="sm">Record waste</Button>
            <Button size="sm" variant="primary">
              Add to order
            </Button>
          </>
        }
      >
        Body
      </Drawer>,
    );
    const foot = container.querySelector('.bp-drawer__foot');
    expect(foot?.querySelectorAll('.bp-btn')).toHaveLength(2);
  });
});
