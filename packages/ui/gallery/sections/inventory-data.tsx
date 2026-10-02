import { formatPeso } from '@brewpoint/shared';
import type { ReactNode } from 'react';
import { StatusChip, type DataTableColumn } from '../../src';

export interface InventoryRow {
  id: string;
  name: string;
  pack: string;
  onHand: string;
  base?: string;
  reorder: string;
  /** Stock value in centavos. */
  value: number;
  expiry: string | null;
  status: 'expired' | 'low' | 'expiring' | 'out' | 'ok';
}

/** The rows of the InventoryScreen preview. */
export const INVENTORY: InventoryRow[] = [
  {
    id: 'milk',
    name: 'Fresh milk',
    pack: '1 L box',
    onHand: '4.75 boxes',
    base: '4,750 ml',
    reorder: '3 boxes',
    value: 42750,
    expiry: 'Oct 2',
    status: 'expired',
  },
  {
    id: 'oat',
    name: 'Oat milk',
    pack: '1 L box',
    onHand: '0.5 box',
    base: '500 ml',
    reorder: '2 boxes',
    value: 9000,
    expiry: 'Mar 10, 2027',
    status: 'low',
  },
  {
    id: 'cream',
    name: 'Whipped cream',
    pack: '500 g can',
    onHand: '1 can',
    base: '500 g',
    reorder: '2 cans',
    value: 31000,
    expiry: 'Sep 30',
    status: 'expiring',
  },
  {
    id: 'croissant',
    name: 'Butter Croissant',
    pack: 'piece',
    onHand: '3 pcs',
    reorder: '12 pcs',
    value: 12600,
    expiry: 'Sep 29',
    status: 'low',
  },
  {
    id: 'water',
    name: 'Bottled Water',
    pack: 'piece',
    onHand: '0 pcs',
    reorder: '24 pcs',
    value: 0,
    expiry: null,
    status: 'out',
  },
  {
    id: 'beans',
    name: 'Espresso beans',
    pack: '1 kg bag',
    onHand: '3.2 bags',
    base: '3,200 g',
    reorder: '2 bags',
    value: 304000,
    expiry: 'Dec 15',
    status: 'ok',
  },
];

const STATUS: Record<InventoryRow['status'], ReactNode> = {
  expired: (
    <StatusChip tone="danger" icon="calendar-x">
      Expired batch
    </StatusChip>
  ),
  low: (
    <StatusChip tone="warning" icon="alert">
      Low
    </StatusChip>
  ),
  expiring: (
    <StatusChip tone="warning" icon="clock">
      Expires in 2 days
    </StatusChip>
  ),
  out: (
    <StatusChip tone="danger" icon="x">
      Out of stock
    </StatusChip>
  ),
  ok: (
    <StatusChip tone="success" icon="check">
      In stock
    </StatusChip>
  ),
};

export const INVENTORY_COLUMNS: DataTableColumn<InventoryRow>[] = [
  { key: 'item', header: 'Item', cell: (r) => r.name, sub: (r) => r.pack },
  { key: 'onhand', header: 'On hand', numeric: true, cell: (r) => r.onHand, sub: (r) => r.base },
  { key: 'reorder', header: 'Reorder point', numeric: true, cell: (r) => r.reorder },
  { key: 'value', header: 'Stock value', numeric: true, cell: (r) => formatPeso(r.value) },
  {
    key: 'expiry',
    header: 'Next expiry',
    cell: (r) => r.expiry ?? <span className="bp-muted">No expiry</span>,
  },
  { key: 'status', header: 'Status', cell: (r) => STATUS[r.status] },
];

export interface OnHandRow {
  id: string;
  name: string;
  pack: string;
  onHand: string;
  base?: string;
  /** Average cost in centavos per base unit, and that unit. */
  cost: [number, string];
  value: number;
  status: InventoryRow['status'];
}

/** The rows of the DataTable preview. */
export const ON_HAND: OnHandRow[] = [
  {
    id: 'milk',
    name: 'Fresh milk',
    pack: '1 L box',
    onHand: '4.75 boxes',
    base: '4,750 ml',
    cost: [9, 'ml'],
    value: 42750,
    status: 'ok',
  },
  {
    id: 'beans',
    name: 'Espresso beans',
    pack: '1 kg bag',
    onHand: '3.2 bags',
    base: '3,200 g',
    cost: [95, 'g'],
    value: 304000,
    status: 'ok',
  },
  {
    id: 'oat',
    name: 'Oat milk',
    pack: '1 L box',
    onHand: '0.5 box',
    base: '500 ml',
    cost: [18, 'ml'],
    value: 9000,
    status: 'low',
  },
  {
    id: 'croissant',
    name: 'Butter Croissant',
    pack: 'piece',
    onHand: '3 pcs',
    cost: [4200, 'pc'],
    value: 12600,
    status: 'low',
  },
  {
    id: 'water',
    name: 'Bottled Water',
    pack: 'piece',
    onHand: '0 pcs',
    cost: [1500, 'pc'],
    value: 0,
    status: 'out',
  },
];

export const ON_HAND_COLUMNS: DataTableColumn<OnHandRow>[] = [
  { key: 'item', header: 'Item', cell: (r) => r.name, sub: (r) => r.pack },
  { key: 'onhand', header: 'On hand', numeric: true, cell: (r) => r.onHand, sub: (r) => r.base },
  {
    key: 'cost',
    header: 'Avg cost',
    numeric: true,
    cell: ({ cost: [centavos, unit] }) => `${formatPeso(centavos)}/${unit}`,
  },
  { key: 'value', header: 'Stock value', numeric: true, cell: (r) => formatPeso(r.value) },
  { key: 'status', header: 'Status', cell: (r) => STATUS[r.status] },
];
