import type { ReactNode } from 'react';
import { cx } from './cx';

export interface CardProps {
  /** Names what the card holds ("Sales by hour", "Usage"). */
  title: string;
  /** The period or scope in words, first ("Today, 7 AM to 7 PM"). */
  meta?: ReactNode;
  /** The title's heading level. Defaults to h3, as in the previews. */
  as?: 'h2' | 'h3';
  /** Right-aligned under the content, such as a "View all" link. */
  foot?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** A raised panel with a title and meta: holds a chart, a list or a set of meters. */
export function Card({ title, meta, as: Heading = 'h3', foot, className, children }: CardProps) {
  return (
    <section className={cx('bp-card', className)}>
      <div className="bp-card__head">
        <Heading className="bp-card__title">{title}</Heading>
        {meta && <span className="bp-card__meta">{meta}</span>}
      </div>
      {children}
      {foot && <div className="bp-card__foot">{foot}</div>}
    </section>
  );
}
