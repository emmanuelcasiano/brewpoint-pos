import type { ReactNode } from 'react';

export type TimelineState = 'done' | 'now' | 'upcoming';

export interface TimelineStep {
  key: string;
  state: TimelineState;
  /** The step in bold, then who and when: <b>Sent</b> by email, Sep 27, 4:12 PM. */
  content: ReactNode;
}

export interface TimelineProps {
  steps: readonly TimelineStep[];
}

const STATE_CLASS: Record<TimelineState, string | undefined> = {
  done: 'is-done',
  now: 'is-now',
  upcoming: undefined,
};

/** Read before each step, since the dot alone shows its state by color. */
const STATE_WORD: Record<TimelineState, string | null> = {
  done: 'Done: ',
  now: null,
  upcoming: 'Not yet: ',
};

/** A record's history and what comes next, such as a purchase order from Created to Received. */
export function Timeline({ steps }: TimelineProps) {
  return (
    <ol className="bp-timeline">
      {steps.map((step) => (
        <li
          key={step.key}
          className={STATE_CLASS[step.state]}
          aria-current={step.state === 'now' ? 'step' : undefined}
        >
          <span>
            {STATE_WORD[step.state] && <span className="bp-sr">{STATE_WORD[step.state]}</span>}
            {step.content}
          </span>
        </li>
      ))}
    </ol>
  );
}
