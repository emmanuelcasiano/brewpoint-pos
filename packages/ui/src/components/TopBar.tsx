import type { ReactNode } from 'react';
import { cx } from './cx';

export interface TopBarProps {
  shopName: string;
  /** The branch and device ("Main branch, device T1"). */
  meta: string;
  /** The register StatusChip ("Register open", "Register closed"). */
  register?: ReactNode;
  /** The license StatusChip, only when the offline license is within 3 days of ending. */
  license?: ReactNode;
  /** The sync ChipButton, which opens the sync queue. */
  sync: ReactNode;
  /** The UserButton. */
  user: ReactNode;
  className?: string;
}

/**
 * The POS top bar. The order is fixed in every state: shop and device, the register and license
 * chips, then at the right the sync chip and the user.
 */
export function TopBar({ shopName, meta, register, license, sync, user, className }: TopBarProps) {
  return (
    <header className={cx('bp-topbar', className)}>
      <div className="bp-topbar__shop">
        <h1 className="bp-topbar__name">{shopName}</h1>
        <span className="bp-topbar__meta">{meta}</span>
      </div>
      {register}
      {license}
      <span className="bp-topbar__spacer" />
      {sync}
      {user}
    </header>
  );
}
