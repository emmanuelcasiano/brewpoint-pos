import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cx } from './cx';
import { focusableIn } from './focusable';

export interface ModalProps {
  /** Labels the dialog. */
  title: string;
  /** The muted sentence under the title that explains why the modal is open. */
  description?: ReactNode;
  children?: ReactNode;
  /** The buttons along the bottom, cancel first: they share the row equally. */
  actions: ReactNode;
  /** Escape calls it, as the cancel button should. */
  onCancel: () => void;
  /**
   * Renders in place, filling the nearest positioned parent (a `bp-stage`), instead of over the
   * whole page, and leaves focus alone. For previews and the gallery only.
   */
  contained?: boolean;
}

/**
 * A dialog over a scrim. Focus moves into it on open, Tab stays inside it, Escape cancels, and
 * focus returns to where it was on close.
 */
export function Modal({
  title,
  description,
  children,
  actions,
  onCancel,
  contained = false,
}: ModalProps) {
  const titleId = useId();
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contained) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const el = dialog.current;
    if (el) (focusableIn(el)[0] ?? el).focus();
    return () => opener?.focus();
  }, [contained]);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onCancel();
      return;
    }
    if (event.key !== 'Tab' || contained) return;
    const items = focusableIn(event.currentTarget);
    const first = items[0];
    const last = items.at(-1);
    if (!first || !last) {
      event.preventDefault();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const scrim = (
    <div className={cx('bp-scrim', !contained && 'fixed z-modal')}>
      <div
        ref={dialog}
        className="bp-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <div>
          <h2 className="bp-modal__title" id={titleId}>
            {title}
          </h2>
          {description && <p className="bp-modal__body">{description}</p>}
        </div>
        {children}
        <div className="bp-modal__actions">{actions}</div>
      </div>
    </div>
  );

  return contained ? scrim : createPortal(scrim, document.body);
}
