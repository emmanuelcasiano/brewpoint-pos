import type { GallerySection } from '../Specimen';
import { buttonSection, iconButtonSection } from './actions';
import { bannerSection, statusChipSection, toastSection } from './feedback';
import { fieldSection, switchSection } from './forms';
import { numpadSection, pinPromptSection } from './keypads';
import { colorSection, iconSection, pesoSection, typeSection } from './foundations';
import {
  dataTableSection,
  pageHeadSection,
  splitSection,
  tabsSection,
  toolbarSection,
} from './layout';
import { consoleNavSection, sideNavSection, topBarSection } from './navigation';

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
  pageHeadSection,
  tabsSection,
  toolbarSection,
  dataTableSection,
  splitSection,
  sideNavSection,
  consoleNavSection,
  topBarSection,
];
