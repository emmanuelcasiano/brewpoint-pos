import type { ButtonHTMLAttributes } from 'react';
import { Icon } from '../icons/Icon';
import { cx } from './cx';

export interface UserButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** The signed-in person's first name ("Ana"). */
  name: string;
  /** Their role ("Cashier", "Superadmin"). */
  role: string;
}

/** The 44px signed-in user pill. It opens the menu with Switch user and Log out. */
export function UserButton({ name, role, type = 'button', className, ...rest }: UserButtonProps) {
  return (
    <button type={type} className={cx('bp-user', className)} {...rest}>
      <Icon name="user" size={18} />
      {name}, {role}
    </button>
  );
}
