import { formatPeso } from '@brewpoint/shared';
import { Icon, ICON_NAMES } from '../../src';
import type { GallerySection } from '../Specimen';

// Class names are written out in full so Tailwind can find them.
const TYPE_STYLES = [
  ['font-display text-display-xl', 'display-xl', 'Kape Davao'],
  ['font-display text-display-lg', 'display-lg', 'Open register'],
  ['font-display text-heading-md', 'heading-md', 'Iced Latte'],
  ['font-display text-heading-sm', 'heading-sm', 'Modifiers'],
  ['text-body-lg', 'body-lg', 'Two lattes and a croissant'],
  ['text-body', 'body', 'Ask a manager to approve this discount.'],
  ['text-body-sm', 'body-sm', 'Oat milk, extra shot'],
  ['text-label', 'label', 'Cash tendered'],
  ['text-eyebrow uppercase', 'eyebrow', 'Payment'],
  ['text-caption', 'caption', 'Synced 2 minutes ago'],
  ['text-amount-xl tabular-nums', 'amount-xl', formatPeso(124500)],
  ['text-amount-lg tabular-nums', 'amount-lg', formatPeso(38500)],
  ['text-amount tabular-nums', 'amount', formatPeso(14500)],
  ['text-key tabular-nums', 'key', '7 8 9'],
  ['font-mono text-receipt', 'receipt', 'ACK-T1-000123  1,245.00'],
] as const;

const SURFACES = [
  ['bg-surface', 'surface'],
  ['bg-surface-raised', 'surface-raised'],
  ['bg-surface-sunken', 'surface-sunken'],
  ['bg-brand text-on-brand', 'brand'],
  ['bg-accent text-on-accent', 'accent'],
  ['bg-accent-soft text-ink', 'accent-soft'],
  ['bg-success-soft text-success', 'success'],
  ['bg-warning-soft text-warning', 'warning'],
  ['bg-danger-soft text-danger', 'danger'],
  ['bg-info-soft text-info', 'info'],
  ['bg-chart-1 text-surface-raised', 'chart-1'],
  ['bg-chart-2 text-surface-raised', 'chart-2'],
  ['bg-chart-3 text-surface-raised', 'chart-3'],
  ['bg-chart-4 text-surface-raised', 'chart-4'],
] as const;

export const typeSection: GallerySection = {
  id: 'type',
  title: 'Type',
  render: () => (
    <div className="flex flex-col gap-3">
      {TYPE_STYLES.map(([className, name, sample]) => (
        <div key={name} className="flex flex-col">
          <span className="text-caption text-ink-muted">{name}</span>
          <span className={className}>{sample}</span>
        </div>
      ))}
    </div>
  ),
};

export const colorSection: GallerySection = {
  id: 'color',
  title: 'Color tokens',
  render: () => (
    <div className="grid grid-cols-2 gap-2">
      {SURFACES.map(([className, name]) => (
        <div key={name} className={`${className} rounded-md border border-border p-3 text-label`}>
          {name}
        </div>
      ))}
      <div className="col-span-2 rounded-md border-2 border-accent-strong bg-surface-raised p-3 text-label text-accent-strong">
        accent-strong text on surface-raised
      </div>
    </div>
  ),
};

export const iconSection: GallerySection = {
  id: 'icons',
  title: 'Icons',
  render: () => (
    <ul className="grid grid-cols-3 gap-2">
      {ICON_NAMES.map((name) => (
        <li key={name} className="flex items-center gap-2 text-body-sm">
          <Icon name={name} />
          {name}
        </li>
      ))}
    </ul>
  ),
};

export const pesoSection: GallerySection = {
  id: 'peso',
  title: 'Peso sign in the bundled fonts',
  render: () => (
    <div className="flex flex-col gap-2">
      <span className="font-sans text-amount-lg">{formatPeso(124500)} IBM Plex Sans</span>
      <span className="font-display text-heading-md">{formatPeso(124500)} Bricolage Grotesque</span>
      <span className="font-mono text-body">{formatPeso(124500)} IBM Plex Mono</span>
    </div>
  ),
};
