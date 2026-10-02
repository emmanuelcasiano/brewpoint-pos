import { useState } from 'react';
import { Field, MoneyInput, Switch } from '../../src';

export function CashField() {
  const [cash, setCash] = useState<number | null>(40000);
  return (
    <Field label="Cash tendered">
      <MoneyInput value={cash} onChange={setCash} />
    </Field>
  );
}

const ALERTS = [
  ['Out of stock', 'When an item reaches 0 or below', [true, true, true]],
  ['Expired', 'When a batch passes its expiry date with stock left', [true, true, true]],
  ['Expiring soon', 'Inside the window set below', [true, false, true]],
  ['Low stock', 'When an item reaches its reorder point', [true, false, true]],
] as const;

/** Urgent alerts always reach the back-office, so that switch is locked on. */
const LOCKED = new Set(['Out of stock', 'Expired']);

const CHANNELS = ['back-office', 'push', 'email digest'] as const;

/** The stock alerts group from the SettingsScreen preview. */
export function SettingsRows() {
  return (
    <section className="bp-group">
      <div className="bp-group__head">
        <div>
          <h3 className="bp-card__title">Stock alerts</h3>
          <span className="bp-note">
            Where each alert reaches you. In the back-office is always on for urgent alerts.
          </span>
        </div>
      </div>
      <div className="bp-setrow bp-setrow--head">
        <span>Alert</span>
        <span>Back-office</span>
        <span>Push</span>
        <span>Email digest</span>
      </div>
      {ALERTS.map(([name, help, on]) => (
        <div key={name} className="bp-setrow">
          <div>
            <span className="bp-setrow__name">{name}</span>
            <span className="bp-setrow__help">{help}</span>
          </div>
          {CHANNELS.map((channel, i) => (
            <Switch
              key={channel}
              label={`${name}, ${channel}`}
              defaultChecked={on[i]}
              disabled={i === 0 && LOCKED.has(name)}
            />
          ))}
        </div>
      ))}
    </section>
  );
}
