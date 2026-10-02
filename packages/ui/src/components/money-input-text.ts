import { formatPeso } from '@brewpoint/shared';

/** What the money input accepts while typing: digits and commas, then up to two decimals. */
const MONEY_TEXT = /^[\d,]*(\.\d{0,2})?$/;

/** The largest amount the input takes: ₱9,999,999.99. */
const MAX_CENTAVOS = 999_999_999;

/** True when the text can still become an amount, so the keystroke is kept. */
export function isMoneyText(text: string): boolean {
  return MONEY_TEXT.test(text) && (parseMoneyText(text) ?? 0) <= MAX_CENTAVOS;
}

/**
 * Turns typed peso text into integer centavos without floats: "1,245.5" becomes 124550.
 * Returns null for empty or unreadable text.
 */
export function parseMoneyText(text: string): number | null {
  const match = /^(\d*)(?:\.(\d{0,2}))?$/.exec(text.replaceAll(',', ''));
  if (!match) return null;
  const whole = match[1] ?? '';
  const fraction = match[2] ?? '';
  if (whole === '' && fraction === '') return null;
  return Number(whole || '0') * 100 + Number(fraction.padEnd(2, '0'));
}

/** Centavos as the input shows them, without the peso sign (the prefix shows it): "1,245.00". */
export function formatMoneyText(centavos: number | null): string {
  return centavos === null ? '' : formatPeso(centavos).replace('₱', '');
}
