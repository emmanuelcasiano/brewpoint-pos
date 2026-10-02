import { Button } from './Button';

export interface QuickAmount {
  /** "Exact", "₱500". */
  label: string;
  /** Integer centavos. */
  centavos: number;
}

export interface QuickAmountsProps {
  amounts: QuickAmount[];
  onSelect: (centavos: number) => void;
}

/** One-tap cash amounts beside the numpad: "Exact" and the common notes. */
export function QuickAmounts({ amounts, onSelect }: QuickAmountsProps) {
  return (
    <div className="bp-quick">
      {amounts.map((amount) => (
        <Button key={amount.label} size="sm" onClick={() => onSelect(amount.centavos)}>
          {amount.label}
        </Button>
      ))}
    </div>
  );
}
