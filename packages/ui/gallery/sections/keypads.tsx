import type { GallerySection } from '../Specimen';
import { CashEntry, PinEntry, PinPromptDemo } from './keypad-demos';

export const numpadSection: GallerySection = {
  id: 'numpad',
  title: 'Numpad, PinDots, AmountDisplay, QuickAmounts',
  preview: 'Numpad',
  render: () => (
    <div className="flex flex-wrap items-start gap-8">
      <PinEntry />
      <CashEntry />
    </div>
  ),
};

export const pinPromptSection: GallerySection = {
  id: 'pin-prompt',
  title: 'Modal and PinPrompt',
  preview: 'PinPrompt',
  render: () => <PinPromptDemo />,
};
