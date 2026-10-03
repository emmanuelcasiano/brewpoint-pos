import { create } from 'qrcode';
import { useMemo } from 'react';

/**
 * A QR code drawn as SVG squares, dark on paper in both themes so every authenticator app can
 * scan it. The value never leaves the page.
 */
export function QrCode({ value, label }: { value: string; label: string }) {
  const { size, path } = useMemo(() => {
    const { modules } = create(value, { errorCorrectionLevel: 'M' });
    const squares: string[] = [];
    for (let row = 0; row < modules.size; row++) {
      for (let col = 0; col < modules.size; col++) {
        if (modules.get(row, col)) squares.push(`M${col + 4} ${row + 4}h1v1h-1z`);
      }
    }
    return { size: modules.size + 8, path: squares.join('') };
  }, [value]);

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${size} ${size}`}
      className="h-[220px] w-[220px] rounded-md bg-paper text-paper-ink"
      shapeRendering="crispEdges"
    >
      <path d={path} fill="currentColor" />
    </svg>
  );
}
