/**
 * Compact pesos for chart axes only: 1250000 centavos becomes "₱12.5k".
 * Tooltips, tables and everything else use formatPeso.
 */
export function formatPesoShort(centavos: number): string {
  const pesos = Math.round(centavos) / 100;
  const abs = Math.abs(pesos);
  const sign = pesos < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    return `${sign}₱${oneDecimal(abs / 1_000_000)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}₱${oneDecimal(abs / 1_000)}k`;
  }
  return `${sign}₱${Math.round(abs)}`;
}

function oneDecimal(value: number): string {
  return String(Math.round(value * 10) / 10);
}
