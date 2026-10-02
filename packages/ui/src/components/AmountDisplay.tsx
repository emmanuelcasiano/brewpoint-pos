import { formatPeso } from '@brewpoint/shared';

export interface AmountDisplayProps {
  label: string;
  /** Integer centavos. */
  centavos: number;
}

/** The cash amount above a numpad: label on the left, the peso amount right-aligned. */
export function AmountDisplay({ label, centavos }: AmountDisplayProps) {
  return (
    <div className="bp-display">
      <span className="bp-display__label">{label}</span>
      <span className="bp-display__value" aria-live="polite">
        {formatPeso(centavos)}
      </span>
    </div>
  );
}
