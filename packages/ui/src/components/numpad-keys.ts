export type NumpadDigit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
export type NumpadKey = NumpadDigit | 'clear' | 'delete' | 'confirm';

/** The fixed key order: 1-2-3 down to Clear, 0, Delete. Digits are never reordered. */
export const NUMPAD_KEYS = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  'clear',
  '0',
  'delete',
] as const satisfies readonly NumpadKey[];

/**
 * The digit string after one key: a digit is added up to `maxLength`, Clear empties it, Delete
 * drops the last digit. Use it for a PIN, or for cash as a string of centavos.
 */
export function applyNumpadKey(digits: string, key: NumpadKey, maxLength: number): string {
  if (key === 'clear') return '';
  if (key === 'delete') return digits.slice(0, -1);
  if (key === 'confirm') return digits;
  return digits.length < maxLength ? digits + key : digits;
}
