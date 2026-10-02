import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PinPrompt, type PinPromptProps } from './PinPrompt';

const APPROVERS = [
  { id: 'maria', label: 'Maria Santos, Manager' },
  { id: 'emmanuel', label: 'Emmanuel, Owner' },
];

type HarnessProps = Partial<Pick<PinPromptProps, 'locked' | 'checking'>> & {
  correctPin?: string;
  onApprove?: (approverId: string, pin: string) => void;
  onCancel?: () => void;
};

/** Plays the caller: holds the PIN, checks it, and counts the tries. */
function Harness({
  correctPin = '2741',
  onApprove = vi.fn(),
  onCancel = vi.fn(),
  ...rest
}: HarnessProps) {
  const [approverId, setApproverId] = useState('maria');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string>();
  return (
    <PinPrompt
      reason="A 30% discount is over your limit (10%, up to ₱100.00). Ask a manager to enter their PIN."
      approvers={APPROVERS}
      approverId={approverId}
      onApproverChange={setApproverId}
      pin={pin}
      onPinChange={(next) => {
        setPin(next);
        setError(undefined);
      }}
      error={error}
      onApprove={() => {
        if (pin === correctPin) {
          onApprove(approverId, pin);
        } else {
          setPin('');
          setError('Wrong PIN. 3 tries left on this device.');
        }
      }}
      onCancel={onCancel}
      {...rest}
    />
  );
}

async function enter(digits: string) {
  for (const d of digits) await userEvent.click(screen.getByRole('button', { name: d }));
}

describe('PinPrompt', () => {
  it('states the reason and lists the approvers', () => {
    render(<Harness />);

    expect(screen.getByRole('dialog', { name: 'Manager approval needed' })).toHaveTextContent(
      'A 30% discount is over your limit',
    );
    expect(screen.getByLabelText('Approver')).toHaveDisplayValue('Maria Santos, Manager');
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('keeps Approve disabled until the PIN is complete, then approves', async () => {
    const onApprove = vi.fn();
    render(<Harness onApprove={onApprove} />);
    const approve = screen.getByRole('button', { name: 'Approve' });

    await enter('274');
    expect(screen.getByRole('img', { name: '3 of 4 digits entered' })).toBeInTheDocument();
    expect(approve).toBeDisabled();

    await enter('1');
    expect(approve).toBeEnabled();
    await userEvent.selectOptions(screen.getByLabelText('Approver'), 'emmanuel');
    await userEvent.click(approve);
    expect(onApprove).toHaveBeenCalledWith('emmanuel', '2741');
  });

  it('clears the dots and shows the message after a wrong PIN', async () => {
    render(<Harness />);
    await enter('1111');
    await userEvent.click(screen.getByRole('button', { name: 'Approve' }));

    const dots = screen.getByRole('img', { name: '0 of 4 digits entered' });
    expect(dots).toHaveClass('bp-pin--error');
    expect(screen.getByRole('alert')).toHaveTextContent('Wrong PIN. 3 tries left on this device.');
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled();

    await enter('2');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('disables the keypad and Approve when the approver is locked', async () => {
    render(<Harness locked />);
    await enter('2741');

    expect(screen.getByRole('img', { name: '0 of 4 digits entered' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
  });

  it('shows Approve as loading while the PIN is checked', () => {
    render(<Harness checking />);
    expect(screen.getByRole('button', { name: 'Approve' })).toHaveAttribute('aria-busy', 'true');
  });

  it('cancels with the button or Escape', async () => {
    const onCancel = vi.fn();
    render(<Harness onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await userEvent.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(2);
  });
});
