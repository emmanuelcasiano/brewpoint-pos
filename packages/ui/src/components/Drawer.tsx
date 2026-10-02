import { useId, type ReactNode } from 'react';
import { IconButton } from './IconButton';

export interface DrawerProps {
  /** The selected record's name; it also names the drawer. */
  title: string;
  /** One line under the title ("1 L box. Ingredient in 9 products"). */
  meta?: ReactNode;
  /** Shows the close button. */
  onClose?: () => void;
  /** The drawer's actions, such as Record waste, Adjust and a primary Add to order. */
  footer?: ReactNode;
  children: ReactNode;
}

/** The detail panel beside a list, inside a Split. */
export function Drawer({ title, meta, onClose, footer, children }: DrawerProps) {
  const titleId = useId();
  return (
    <aside className="bp-drawer" aria-labelledby={titleId}>
      <div className="bp-drawer__head">
        <div>
          <h3 id={titleId} className="bp-card__title">
            {title}
          </h3>
          {meta && <span className="bp-note">{meta}</span>}
        </div>
        {onClose && <IconButton icon="x" label="Close" onClick={onClose} />}
      </div>
      <div className="bp-drawer__body">{children}</div>
      {footer && <div className="bp-drawer__foot">{footer}</div>}
    </aside>
  );
}
