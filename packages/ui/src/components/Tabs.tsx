import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cx } from './cx';
import { formatCount } from './format-count';

export interface TabItem<K extends string> {
  key: K;
  label: ReactNode;
  /** A count after the label ("Open 5"), in the muted chip-count style. */
  count?: number;
}

export interface TabsProps<K extends string> {
  /** What the tabs choose between ("Category", "Alert status"). */
  label: string;
  tabs: readonly TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  /** The id of the region the tabs change, for aria-controls. */
  controls?: string;
  className?: string;
}

const MOVES: Record<string, (index: number, count: number) => number> = {
  ArrowRight: (i, n) => (i + 1) % n,
  ArrowLeft: (i, n) => (i - 1 + n) % n,
  Home: () => 0,
  End: (_, n) => n - 1,
};

/**
 * A row of 44px tabs on a sunken track. The selected tab is the only Tab stop; arrow keys, Home
 * and End move focus between tabs, and Enter or Space selects the focused one.
 */
export function Tabs<K extends string>({
  label,
  tabs,
  value,
  onChange,
  controls,
  className,
}: TabsProps<K>) {
  const list = useRef<HTMLDivElement>(null);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const move = MOVES[event.key];
    const buttons = list.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    if (!move || !buttons?.length) return;
    event.preventDefault();
    const current = Array.from(buttons).indexOf(document.activeElement as HTMLButtonElement);
    buttons[move(Math.max(current, 0), buttons.length)]?.focus();
  }

  return (
    <div
      ref={list}
      className={cx('bp-tabs', className)}
      role="tablist"
      aria-label={label}
      onKeyDown={handleKeyDown}
    >
      {tabs.map((tab) => {
        const selected = tab.key === value;
        return (
          <button
            key={tab.key}
            type="button"
            className="bp-tab"
            role="tab"
            aria-selected={selected}
            aria-controls={controls}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.key)}
          >
            {tab.label}
            {tab.count !== undefined && (
              <>
                {' '}
                <span className="bp-chip__count">{formatCount(tab.count)}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
