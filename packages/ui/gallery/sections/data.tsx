import type { GallerySection } from '../Specimen';
import { DashboardCharts, KpiTiles, OrderTimeline, UsageMeters } from './data-demos';

export const statTileSection: GallerySection = {
  id: 'stat-tile',
  title: 'StatTile and Sparkline',
  preview: 'StatTile',
  render: () => <KpiTiles />,
};

export const chartSection: GallerySection = {
  id: 'chart',
  title: 'Card and Chart',
  preview: 'Chart',
  render: () => <DashboardCharts />,
};

export const meterSection: GallerySection = {
  id: 'meter',
  title: 'Meter',
  preview: 'SubscriptionScreen',
  render: () => <UsageMeters />,
};

export const timelineSection: GallerySection = {
  id: 'timeline',
  title: 'Timeline',
  preview: 'PurchaseOrdersScreen',
  render: () => <OrderTimeline />,
};
