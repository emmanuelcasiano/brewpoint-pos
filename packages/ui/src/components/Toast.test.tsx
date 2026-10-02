import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Toast, TOAST_DURATION_MS } from './Toast';

function renderToast(onDismiss = vi.fn(), onAction = vi.fn()) {
  render(
    <Toast
      icon="alert"
      title="Oat milk is low."
      action={{ label: 'View', onClick: onAction }}
      onDismiss={onDismiss}
    >
      500 ml left at Main branch.
    </Toast>,
  );
  return { onDismiss, onAction, toast: screen.getByRole('status') };
}

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('says one sentence and offers one action', () => {
    const { toast, onAction } = renderToast();
    fireEvent.click(screen.getByRole('button', { name: 'View' }));

    expect(toast).toHaveClass('bp-toast');
    expect(toast).toHaveTextContent('Oat milk is low. 500 ml left at Main branch.');
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(onAction).toHaveBeenCalledOnce();
  });

  it('dismisses itself after 8 seconds', () => {
    const { onDismiss } = renderToast();

    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION_MS - 1);
    });
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('pauses while hovered and resumes with the time left', () => {
    const { toast, onDismiss } = renderToast();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    fireEvent.mouseEnter(toast);
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    fireEvent.mouseLeave(toast);
    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('pauses while focus is inside it', () => {
    const { onDismiss } = renderToast();
    const button = screen.getByRole('button', { name: 'View' });

    act(() => button.focus());
    act(() => {
      vi.advanceTimersByTime(20000);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => button.blur());
    act(() => {
      vi.advanceTimersByTime(TOAST_DURATION_MS);
    });
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
