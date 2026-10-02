import { formatPeso } from '@brewpoint/shared';
import { useState } from 'react';
import {
  AmountDisplay,
  applyNumpadKey,
  Button,
  Numpad,
  PinDots,
  PinPrompt,
  QuickAmounts,
} from '../../src';

const TOTAL = 37350;

export function PinEntry() {
  const [pin, setPin] = useState('27');
  return (
    <section className="bp-stack w-[320px]" aria-label="PIN entry">
      <h2 className="bp-h-sm">Enter your PIN</h2>
      <PinDots filled={pin.length} length={4} />
      <Numpad label="PIN keypad" onKey={(key) => setPin(applyNumpadKey(pin, key, 4))} />
    </section>
  );
}

export function CashEntry() {
  // Centavos as a digit string, so each key shifts the amount: 4, 0, 0, 0, 0 is ₱400.00.
  const [cents, setCents] = useState('40000');
  return (
    <section className="bp-stack w-[320px]" aria-label="Cash tendered">
      <h2 className="bp-h-sm">Cash tendered</h2>
      <AmountDisplay label="Amount" centavos={Number(cents || '0')} />
      <QuickAmounts
        amounts={[
          { label: 'Exact', centavos: TOTAL },
          { label: '₱500', centavos: 50000 },
          { label: '₱1,000', centavos: 100000 },
        ]}
        onSelect={(centavos) => setCents(String(centavos))}
      />
      <Numpad label="Cash keypad" onKey={(key) => setCents(applyNumpadKey(cents, key, 9))} />
      <Button variant="primary" size="lg" block>
        Confirm payment
      </Button>
    </section>
  );
}

const APPROVERS = [
  { id: 'maria', label: 'Maria Santos, Manager' },
  { id: 'emmanuel', label: 'Emmanuel, Owner' },
];

const TILES = [
  ['Iced Latte', 14500],
  ['Hot Americano', 11000],
  ['Butter Croissant', 9500],
] as const;

const REASON = `A 30% discount is over your limit (10%, up to ${formatPeso(10000)}). Ask a manager to enter their PIN.`;

/** The approval with a wrong PIN already entered, as in the preview. 2741 is the right PIN. */
function Approval({ contained, onClose }: { contained?: boolean; onClose: () => void }) {
  const [approverId, setApproverId] = useState('maria');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | undefined>('Wrong PIN. 3 tries left on this device.');
  return (
    <PinPrompt
      contained={contained}
      reason={REASON}
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
        if (pin === '2741') {
          onClose();
          return;
        }
        setPin('');
        setError('Wrong PIN. 2 tries left on this device.');
      }}
      onCancel={onClose}
    />
  );
}

export function PinPromptDemo() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bp-stack">
      <div className="bp-stage min-h-[740px]">
        <div className="bp-canvas min-h-[740px]">
          <div className="bp-grid">
            {TILES.map(([name, price]) => (
              <button key={name} type="button" className="bp-tile" tabIndex={-1}>
                <span className="bp-tile__name">{name}</span>
                <span className="bp-tile__foot">
                  <span className="bp-tile__price">{formatPeso(price)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
        <Approval contained onClose={() => undefined} />
      </div>
      <Button onClick={() => setOpen(true)}>Open as a real modal</Button>
      {open && <Approval onClose={() => setOpen(false)} />}
    </div>
  );
}
