import { useState } from 'react';
import { ACCENT_HEX_ERROR, DEFAULT_ACCENT, isAccentHex, useTheme } from '../src';
import { SECTIONS } from './sections';
import { Specimen } from './Specimen';

/** Crema means "no shop accent": the hand-tuned values in tokens.css apply. */
function shopAccent(value: string): string | null {
  return isAccentHex(value) && value.toUpperCase() !== DEFAULT_ACCENT ? value : null;
}

export function Gallery() {
  const [accentInput, setAccentInput] = useState(DEFAULT_ACCENT);
  const accent = shopAccent(accentInput);
  const { theme, setTheme } = useTheme(accent);
  const accentInvalid = !isAccentHex(accentInput);

  return (
    <div className="flex min-h-screen flex-col gap-8 bg-surface p-6 font-sans text-ink">
      <header className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-display-lg">BrewPoint component gallery</h1>
          <p className="bp-note">
            Each row shows the React component in Daylight and Night shift beside the design
            system&apos;s preview.html. Dev-only; nothing here ships.
          </p>
        </div>
        <span className="flex-1" />
        <span className="bp-segmented" role="group" aria-label="Page theme">
          <button type="button" aria-pressed={theme === 'light'} onClick={() => setTheme('light')}>
            Daylight
          </button>
          <button type="button" aria-pressed={theme === 'dark'} onClick={() => setTheme('dark')}>
            Night shift
          </button>
        </span>
        <div className={accentInvalid ? 'bp-field bp-field--error' : 'bp-field'}>
          <label className="bp-field__label" htmlFor="gallery-accent">
            Shop accent
          </label>
          <input
            id="gallery-accent"
            className="bp-input"
            value={accentInput}
            onChange={(e) => setAccentInput(e.target.value.trim())}
            aria-invalid={accentInvalid}
            aria-describedby={accentInvalid ? 'gallery-accent-error' : undefined}
          />
          {accentInvalid && (
            <span id="gallery-accent-error" className="bp-field__error">
              {ACCENT_HEX_ERROR}
            </span>
          )}
        </div>
      </header>
      <nav aria-label="Sections" className="flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <a key={s.id} className="bp-chip bp-chip--action" href={`#${s.id}`}>
            {s.title}
          </a>
        ))}
      </nav>
      {SECTIONS.map((section) => (
        <Specimen key={section.id} section={section} accent={accent} />
      ))}
    </div>
  );
}
