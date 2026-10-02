import { useEffect, useRef, useState, type ReactNode } from 'react';
import { applyAccent, clearAccent, Segmented, type ThemeName } from '../src';
import { THEME_LABEL, THEME_OPTIONS } from './themes';

export interface GallerySection {
  id: string;
  title: string;
  /** The standalone page in docs/design-system/previews to compare with, without ".html". */
  preview?: string;
  render: () => ReactNode;
}

function setAccent(el: HTMLElement, accent: string | null, theme: ThemeName) {
  if (accent) applyAccent(el, accent, theme);
  else clearAccent(el);
}

function ThemeColumn({
  theme,
  accent,
  children,
}: {
  theme: ThemeName;
  accent: string | null;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) setAccent(ref.current, accent, theme);
  }, [accent, theme]);

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <span className="bp-eyebrow">React, {THEME_LABEL[theme]}</span>
      <div
        ref={ref}
        data-theme={theme}
        data-specimen={theme}
        className="bp-canvas rounded-lg border border-border"
      >
        {children}
      </div>
    </div>
  );
}

function PreviewFrame({ name, accent }: { name: string; accent: string | null }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [theme, setTheme] = useState<ThemeName>('light');
  const [height, setHeight] = useState(240);

  useEffect(() => {
    const iframe = frame.current;
    if (!iframe) return;
    const sync = () => {
      const doc = iframe.contentDocument;
      if (!doc?.documentElement) return;
      doc.documentElement.setAttribute('data-theme', theme);
      setAccent(doc.documentElement, accent, theme);
      setHeight(doc.documentElement.scrollHeight);
    };
    sync();
    iframe.addEventListener('load', sync);
    return () => iframe.removeEventListener('load', sync);
  }, [theme, accent]);

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="bp-eyebrow">preview.html</span>
        <Segmented
          label={`${name} preview theme`}
          options={THEME_OPTIONS}
          value={theme}
          onChange={setTheme}
        />
      </div>
      <iframe
        ref={frame}
        src={`/${name}.html`}
        title={`${name} preview`}
        height={height}
        className="w-full rounded-lg border border-border bg-surface"
      />
    </div>
  );
}

/** One gallery row: the component in Daylight, in Night shift, and the design system's preview. */
export function Specimen({ section, accent }: { section: GallerySection; accent: string | null }) {
  return (
    <section
      id={section.id}
      aria-labelledby={`${section.id}-title`}
      className="flex flex-col gap-3"
      data-section={section.id}
    >
      <h2 id={`${section.id}-title`} className="bp-h-md">
        {section.title}
      </h2>
      <div className="grid gap-4 xl:grid-cols-3">
        <ThemeColumn theme="light" accent={accent}>
          {section.render()}
        </ThemeColumn>
        <ThemeColumn theme="dark" accent={accent}>
          {section.render()}
        </ThemeColumn>
        {section.preview ? (
          <PreviewFrame name={section.preview} accent={accent} />
        ) : (
          <p className="bp-note">No preview.html: compare with the README and tokens.json.</p>
        )}
      </div>
    </section>
  );
}
