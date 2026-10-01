/**
 * Turns integer centavos into peso text: 124500 becomes "₱1,245.00".
 * The only way money becomes text in BrewPoint.
 */
export function formatPeso(centavos: number): string {
  const rounded = Math.round(centavos);
  const sign = rounded < 0 ? '-' : '';
  const abs = Math.abs(rounded);
  const whole = Math.floor(abs / 100);
  const fraction = abs % 100;
  const grouped = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}₱${grouped}.${String(fraction).padStart(2, '0')}`;
}
