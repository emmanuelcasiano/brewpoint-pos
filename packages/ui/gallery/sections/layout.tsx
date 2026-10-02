import type { GallerySection } from '../Specimen';
import {
  CategoryTabs,
  DashboardHead,
  InventoryFilters,
  InventorySplit,
  OnHandTable,
} from './layout-demos';

export const pageHeadSection: GallerySection = {
  id: 'page-head',
  title: 'PageHead, Segmented and Bell',
  preview: 'Dashboard',
  render: () => <DashboardHead />,
};

export const tabsSection: GallerySection = {
  id: 'tabs',
  title: 'Tabs',
  preview: 'ProductsScreen',
  render: () => <CategoryTabs />,
};

export const toolbarSection: GallerySection = {
  id: 'toolbar',
  title: 'Toolbar, FilterChip and SearchInput',
  preview: 'InventoryScreen',
  render: () => <InventoryFilters />,
};

export const dataTableSection: GallerySection = {
  id: 'data-table',
  title: 'DataTable and Pager',
  preview: 'DataTable',
  render: () => <OnHandTable />,
};

export const splitSection: GallerySection = {
  id: 'split',
  title: 'Split and Drawer',
  preview: 'InventoryScreen',
  render: () => <InventorySplit />,
};
