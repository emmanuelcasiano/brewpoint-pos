import { formatPeso } from '@brewpoint/shared';
import { useState } from 'react';
import {
  Bell,
  Button,
  DataTable,
  Drawer,
  FilterChip,
  PageHead,
  Pager,
  SearchInput,
  Segmented,
  Select,
  Split,
  TableCode,
  Tabs,
  Toolbar,
  ToolbarSpacer,
} from '../../src';
import { INVENTORY, INVENTORY_COLUMNS, ON_HAND, ON_HAND_COLUMNS } from './inventory-data';

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: 'custom', label: 'Custom', icon: 'calendar' },
] as const;

/** The Dashboard preview's page head: branch, period and the bell. */
export function DashboardHead() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]['key']>('today');
  const [open, setOpen] = useState(false);
  return (
    <PageHead title="Good afternoon, Maria" meta="Monday, Sep 28, 2026. Updated 3:05 PM">
      <Select className="min-h-target-min w-auto" aria-label="Branch">
        <option>Main branch</option>
        <option>All branches</option>
      </Select>
      <Segmented label="Period" options={PERIODS} value={period} onChange={setPeriod} />
      <Bell count={5} expanded={open} onClick={() => setOpen(!open)} />
    </PageHead>
  );
}

const CATEGORIES = [
  { key: 'all', label: 'All', count: 24 },
  { key: 'coffee', label: 'Coffee', count: 12 },
  { key: 'noncoffee', label: 'Non-coffee', count: 5 },
  { key: 'pastry', label: 'Pastry', count: 5 },
  { key: 'bottled', label: 'Bottled', count: 2 },
] as const;

/** The ProductsScreen preview's toolbar: category tabs and search. */
export function CategoryTabs() {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]['key']>('all');
  return (
    <Toolbar>
      <Tabs label="Category" tabs={CATEGORIES} value={category} onChange={setCategory} />
      <ToolbarSpacer />
      <SearchInput label="Search products" placeholder="Search products" />
    </Toolbar>
  );
}

const FILTERS = [
  { key: 'all', label: 'All items', count: 38 },
  { key: 'attention', label: 'Needs attention', count: 5, icon: 'alert' },
  { key: 'ingredients', label: 'Ingredients', count: 22 },
  { key: 'packaging', label: 'Packaging', count: 9 },
  { key: 'retail', label: 'Retail', count: 7 },
] as const;

/** The InventoryScreen preview's toolbar: filter chips and search. */
export function InventoryFilters() {
  const [filter, setFilter] = useState<string>('all');
  return (
    <Toolbar>
      {FILTERS.map((f) => (
        <FilterChip
          key={f.key}
          pressed={filter === f.key}
          icon={'icon' in f ? f.icon : undefined}
          count={f.count}
          onClick={() => setFilter(f.key)}
        >
          {f.label}
        </FilterChip>
      ))}
      <ToolbarSpacer />
      <SearchInput label="Search inventory" placeholder="Search items" />
    </Toolbar>
  );
}

const BATCHES = [
  { code: 'B-0921', expires: 'Expired Sep 27', left: '2 boxes' },
  { code: 'B-0925', expires: 'Oct 2', left: '2.75 boxes' },
];

/** The InventoryScreen preview's table beside the Fresh milk drawer. Click a row to open it. */
export function InventorySplit() {
  const [selected, setSelected] = useState<string | null>('milk');
  const item = INVENTORY.find((row) => row.id === selected);
  return (
    <Split>
      <DataTable
        caption="Inventory at Main branch"
        columns={INVENTORY_COLUMNS}
        rows={INVENTORY}
        rowKey={(row) => row.id}
        selectedKey={selected}
        onRowClick={(row) => setSelected(row.id)}
        compact
      />
      {item && (
        <Drawer
          title={item.name}
          meta={`${item.pack}. Ingredient in 9 products`}
          onClose={() => setSelected(null)}
          footer={
            <>
              <Button size="sm">Record waste</Button>
              <Button size="sm">Adjust</Button>
              <Button size="sm" variant="primary">
                Add to order
              </Button>
            </>
          }
        >
          <dl className="bp-kv">
            <dt>On hand</dt>
            <dd>
              {item.onHand}
              {item.base && ` (${item.base})`}
            </dd>
            <dt>Reorder point</dt>
            <dd>{item.reorder}</dd>
            <dt>Average cost</dt>
            <dd>{formatPeso(9)}/ml</dd>
            <dt>Default supplier</dt>
            <dd>Dairy Fresh Davao</dd>
          </dl>
          <div className="bp-stack gap-2">
            <span className="bp-field__label">Batches, oldest used first</span>
            <DataTable
              caption="Batches"
              columns={[
                { key: 'batch', header: 'Batch', cell: (b) => <TableCode>{b.code}</TableCode> },
                {
                  key: 'expires',
                  header: 'Expires',
                  cell: (b) => b.expires,
                  className: 'bp-nowrap',
                },
                {
                  key: 'left',
                  header: 'Left',
                  numeric: true,
                  cell: (b) => b.left,
                  className: 'bp-nowrap',
                },
              ]}
              rows={BATCHES}
              rowKey={(b) => b.code}
              compact
            />
          </div>
        </Drawer>
      )}
    </Split>
  );
}

/** The DataTable preview's table, with Oat milk selected, and a pager under it. */
export function OnHandTable() {
  const [page, setPage] = useState(1);
  return (
    <div className="bp-stack">
      <DataTable
        caption="Inventory on hand"
        columns={ON_HAND_COLUMNS}
        rows={ON_HAND}
        rowKey={(row) => row.id}
        selectedKey="oat"
      />
      <Pager
        summary={`Page ${page} of 8. Showing 5 of 38 items`}
        hasPrevious={page > 1}
        hasNext={page < 8}
        onPrevious={() => setPage(page - 1)}
        onNext={() => setPage(page + 1)}
      />
    </div>
  );
}
