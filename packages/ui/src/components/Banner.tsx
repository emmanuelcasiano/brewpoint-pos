import type { ReactNode } from 'react';
import { Icon } from '../icons/Icon';
import type { IconName } from '../icons/icon-paths';
import { Button } from './Button';
import { cx } from './cx';

export type BannerTone = 'info' | 'warning' | 'danger' | 'offline';

export interface BannerAction {
  /** Names the result: "Sync now", "Choose plan". */
  label: string;
  onClick: () => void;
}

export interface BannerProps {
  /** Offline is neutral brand brown, never red. Danger only when selling is blocked. */
  tone?: BannerTone;
  /** Defaults to info, alert, lock or wifi-off by tone. */
  icon?: IconName;
  /** The bold first sentence that states the situation: "You are offline." */
  title: string;
  /** One sentence that says what happens or what to do. */
  children?: ReactNode;
  /** At most one action, when the user can act. */
  action?: BannerAction;
  className?: string;
}

const DEFAULT_ICON: Record<BannerTone, IconName> = {
  info: 'info',
  warning: 'alert',
  danger: 'lock',
  offline: 'wifi-off',
};

/**
 * A full-width message under the top bar. It never auto-dismisses; it clears when its condition
 * does. Blocking (danger) banners are alerts, the rest are status messages.
 */
export function Banner({ tone = 'info', icon, title, children, action, className }: BannerProps) {
  return (
    <div
      className={cx('bp-banner', tone !== 'info' && `bp-banner--${tone}`, className)}
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      <span className="bp-banner__icon">
        <Icon name={icon ?? DEFAULT_ICON[tone]} />
      </span>
      <div className="bp-banner__body">
        <span className="bp-banner__title">{title}</span> {children}
      </div>
      {action && (
        <Button size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
