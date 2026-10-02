import type { GallerySection } from '../Specimen';
import { colorSection, iconSection, pesoSection, typeSection } from './foundations';

/** Every gallery row, in page order. Each component step adds its sections here. */
export const SECTIONS: GallerySection[] = [typeSection, colorSection, iconSection, pesoSection];
