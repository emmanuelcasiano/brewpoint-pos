import { useEffect, useRef, useState, type FocusEvent, type ReactNode } from 'react';
import { Icon } from '../icons/Icon';
import type { IconName } from '../icons/icon-paths';
import { Button } from './Button';

/** How long a toast stays, not counting time paused under the pointer or focus. */
export const TOAST_DURATION_MS = 8000;

export interface ToastProps {
  icon: IconName;
  /** The bold sentence: "Oat milk is low." */
  title: string;
  /** Optional detail after it: "500 ml left at Main branch." */
  children?: ReactNode;
  /** The one action: "View", "Reorder". */
  action: { label: string; onClick: () => void };
  /** Called when the time runs out. */
  onDismiss: () => void;
  duration?: number;
}

/**
 * A live back-office event on brand brown: one sentence, one action. It dismisses itself after 8
 * seconds and pauses while the pointer is over it or focus is inside it. Never used on the POS.
 */
export function Toast({
  icon,
  title,
  children,
  action,
  onDismiss,
  duration = TOAST_DURATION_MS,
}: ToastProps) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const remaining = useRef(duration);
  const dismiss = useRef(onDismiss);
  const paused = hovered || focused;

  useEffect(() => {
    dismiss.current = onDismiss;
  }, [onDismiss]);

  useEffect(() => {
    if (paused) return;
    const started = Date.now();
    const timer = setTimeout(() => dismiss.current(), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current -= Date.now() - started;
    };
  }, [paused]);

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
  }

  return (
    <div
      className="bp-toast"
      role="status"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
    >
      <Icon name={icon} />
      <div className="bp-toast__body">
        <b>{title}</b>
        {children && <> {children}</>}
      </div>
      <Button onClick={action.onClick}>{action.label}</Button>
    </div>
  );
}
