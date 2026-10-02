import type { GallerySection } from '../Specimen';
import { buttonSection, iconButtonSection } from './actions';
import { bannerSection, statusChipSection, toastSection } from './feedback';
import { fieldSection, switchSection } from './forms';
import { numpadSection, pinPromptSection } from './keypads';
import { colorSection, iconSection, pesoSection, typeSection } from './foundations';

/** Every gallery row, in page order. Each component step adds its sections here. */
export const SECTIONS: GallerySection[] = [
  typeSection,
  colorSection,
  iconSection,
  pesoSection,
  buttonSection,
  iconButtonSection,
  fieldSection,
  switchSection,
  statusChipSection,
  bannerSection,
  toastSection,
  numpadSection,
  pinPromptSection,
];
