import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import { Modal } from './Modal';

function Harness({ onCancel = vi.fn() }: { onCancel?: () => void }) {
  const [open, setOpen] = useState(false);
  const close = () => {
    onCancel();
    setOpen(false);
  };
  return (
    <>
      <Button onClick={() => setOpen(true)}>Apply discount</Button>
      {open && (
        <Modal
          title="Manager approval needed"
          description="A 30% discount is over your limit."
          onCancel={close}
          actions={
            <>
              <Button onClick={close}>Cancel</Button>
              <Button variant="primary">Approve</Button>
            </>
          }
        />
      )}
    </>
  );
}

describe('Modal', () => {
  it('is a modal dialog labelled by its title, with its description', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Apply discount' }));
    const dialog = screen.getByRole('dialog', { name: 'Manager approval needed' });

    expect(dialog).toHaveClass('bp-modal');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog.parentElement).toHaveClass('bp-scrim', 'fixed', 'z-modal');
    expect(dialog).toHaveTextContent('A 30% discount is over your limit.');
  });

  it('moves focus in, traps Tab, and returns focus on close', async () => {
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Apply discount' });
    await userEvent.click(opener);
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    const approve = screen.getByRole('button', { name: 'Approve' });

    expect(cancel).toHaveFocus();
    await userEvent.tab();
    expect(approve).toHaveFocus();
    await userEvent.tab();
    expect(cancel).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(approve).toHaveFocus();

    await userEvent.click(cancel);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('cancels on Escape', async () => {
    const onCancel = vi.fn();
    render(<Harness onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: 'Apply discount' }));
    await userEvent.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledOnce();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders in place and leaves focus alone when contained', () => {
    const { container } = render(
      <div className="bp-stage">
        <Modal title="Preview" onCancel={vi.fn()} contained actions={<Button>Cancel</Button>} />
      </div>,
    );

    expect(container.querySelector('.bp-stage > .bp-scrim')).not.toHaveClass('fixed');
    expect(screen.getByRole('button', { name: 'Cancel' })).not.toHaveFocus();
  });
});
