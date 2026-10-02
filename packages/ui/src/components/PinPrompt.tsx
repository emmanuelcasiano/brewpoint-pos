import type { ReactNode } from 'react';
import { Icon } from '../icons/Icon';
import { Button } from './Button';
import { Field } from './Field';
import { Modal } from './Modal';
import { applyNumpadKey } from './numpad-keys';
import { Numpad } from './Numpad';
import { PinDots } from './PinDots';
import { Select } from './Select';

export interface Approver {
  id: string;
  /** Name and role: "Maria Santos, Manager". */
  label: string;
}

export interface PinPromptProps {
  title?: string;
  /** The reason with its numbers: "A 30% discount is over your limit (10%, up to ₱100). …" */
  reason: ReactNode;
  /** Only people who hold the approve permission and whose own limit covers the amount. */
  approvers: Approver[];
  approverId: string;
  onApproverChange: (id: string) => void;
  /** The digits entered so far. Clear it after a wrong PIN. */
  pin: string;
  onPinChange: (pin: string) => void;
  /** 4 to 6. */
  pinLength?: number;
  /** "Wrong PIN. 3 tries left on this device." Turns the dots to the error state. */
  error?: string;
  /** The approver is locked on this device: the keypad and Approve are disabled. */
  locked?: boolean;
  /** While the PIN is being checked. */
  checking?: boolean;
  onApprove: () => void;
  /** Returns to the cart with nothing changed. */
  onCancel: () => void;
  /** See Modal. */
  contained?: boolean;
}

/**
 * Manager approval: why it is needed, who approves, their PIN on the keypad, Approve or Cancel.
 * It only displays the state; the caller checks the PIN and counts the tries. It looks the same
 * online and offline.
 */
export function PinPrompt({
  title = 'Manager approval needed',
  reason,
  approvers,
  approverId,
  onApproverChange,
  pin,
  onPinChange,
  pinLength = 4,
  error,
  locked = false,
  checking = false,
  onApprove,
  onCancel,
  contained,
}: PinPromptProps) {
  const complete = pin.length === pinLength;

  return (
    <Modal
      title={title}
      description={reason}
      onCancel={onCancel}
      contained={contained}
      actions={
        <>
          <Button onClick={onCancel}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!complete || locked}
            loading={checking}
            onClick={onApprove}
          >
            Approve
          </Button>
        </>
      }
    >
      <Field label="Approver">
        <Select value={approverId} onChange={(e) => onApproverChange(e.target.value)}>
          {approvers.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </Select>
      </Field>
      <PinDots filled={pin.length} length={pinLength} error={Boolean(error)} />
      {error && (
        <div className="bp-field__error justify-center" role="alert">
          <Icon name="alert" size={16} />
          {error}
        </div>
      )}
      <Numpad
        label="PIN keypad"
        className="self-center"
        disabled={locked || checking}
        onKey={(key) => onPinChange(applyNumpadKey(pin, key, pinLength))}
      />
    </Modal>
  );
}
