import type { ButtonHTMLAttributes } from 'react';
import { Icon } from '../icons/Icon';
import type { IconName } from '../icons/icon-paths';
import { cx } from './cx';

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label' | 'children'
> {
  icon: IconName;
  /** What the button does ("Close", "Edit supplier"). It is the button's only name. */
  label: string;
}

/** A 44px icon-only button for the back-office, such as a drawer's close or edit button. */
export function IconButton({ icon, label, type = 'button', className, ...rest }: IconButtonProps) {
  return (
    <button type={type} className={cx('bp-iconbtn', className)} aria-label={label} {...rest}>
      <Icon name={icon} />
    </button>
  );
}
