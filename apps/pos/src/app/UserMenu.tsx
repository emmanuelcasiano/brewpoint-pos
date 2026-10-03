import { UserButton } from '@brewpoint/ui';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

export interface UserMenuItem {
  label: string;
  /** Shown on the item while its action runs ("Signing out…"). */
  busyLabel: string;
  onSelect: () => Promise<void>;
}

/**
 * The signed-in user's button and the menu it opens. The menu floats over the page, so opening
 * it never moves what is below. It follows the menu button pattern: focus goes to the first
 * item, the arrow keys, Home and End move between items, Escape closes it and returns to the
 * button, and a press outside or Tab closes it.
 */
export function UserMenu({
  firstName,
  fullName,
  role,
  items,
}: {
  firstName: string;
  fullName: string;
  role: string;
  items: UserMenuItem[];
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const buttonId = useId();
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    menuItems(root.current)[0]?.focus();
    function closeOutside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

  function onMenuKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' || event.key === 'Tab') {
      // Back on the button first, so Tab then moves on from it as if the menu were never open.
      document.getElementById(buttonId)?.focus();
      if (event.key === 'Escape') event.preventDefault();
      setOpen(false);
    } else if (moveFocus(menuItems(root.current), event.key)) {
      event.preventDefault();
    }
  }

  async function select(item: UserMenuItem) {
    if (busy) return;
    setBusy(item.label);
    try {
      await item.onSelect();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div ref={root} className="relative">
      <UserButton
        id={buttonId}
        name={firstName}
        role={role}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((isOpen) => !isOpen)}
      />
      {open && (
        <div className="absolute top-full right-0 z-modal mt-2 grid w-[280px] gap-1 rounded-lg border border-border bg-surface-raised p-2 text-ink shadow-2">
          <p className="grid px-3 py-2">
            <span className="text-label">{fullName}</span>
            <span className="text-caption text-ink-muted">{role}</span>
          </p>
          <div
            id={menuId}
            role="menu"
            aria-labelledby={buttonId}
            aria-busy={busy !== null}
            className="grid gap-1 border-t border-border pt-2"
            onKeyDown={onMenuKey}
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                tabIndex={-1}
                aria-disabled={busy !== null}
                className="flex min-h-target-pos w-full items-center rounded-md px-3 text-left text-body-lg text-ink hover:bg-surface-sunken focus-visible:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-focus aria-disabled:text-ink-muted"
                onClick={() => void select(item)}
              >
                {busy === item.label ? item.busyLabel : item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function menuItems(root: HTMLElement | null): HTMLButtonElement[] {
  return [...(root?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])];
}

/** Moves focus for the arrow keys, Home and End; returns whether the key was one of them. */
function moveFocus(items: HTMLButtonElement[], key: string): boolean {
  const at = items.findIndex((item) => item === document.activeElement);
  const target = new Map([
    ['ArrowDown', at + 1],
    ['ArrowUp', at - 1],
    ['Home', 0],
    ['End', items.length - 1],
  ]).get(key);
  if (target === undefined || items.length === 0) return false;
  items[(target + items.length) % items.length]?.focus();
  return true;
}
