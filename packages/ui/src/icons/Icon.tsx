import { ICON_PATHS, type IconName } from './icon-paths';

export interface IconProps {
  name: IconName;
  /** 16 in chips, 20 by default and in the side navigation, 26 on keypad keys. */
  size?: number;
  /** Extra classes, such as `is-spin` on a syncing chip. */
  className?: string;
}

/**
 * A bundled stroke icon in currentColor. Always decorative: pair it with a word, or give the
 * button around it an aria-label.
 */
export function Icon({ name, size = 20, className }: IconProps) {
  return (
    <svg
      className={className ? `bp-icon ${className}` : 'bp-icon'}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICON_PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
