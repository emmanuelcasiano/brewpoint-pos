import { formatPeso } from '@brewpoint/shared';
import { Button, IconButton } from '../../src';
import type { GallerySection } from '../Specimen';

export const buttonSection: GallerySection = {
  id: 'button',
  title: 'Button',
  preview: 'Button',
  render: () => (
    <div className="bp-stack">
      <div className="bp-row">
        <Button variant="primary">Add to order</Button>
        <Button>Hold order</Button>
        <Button variant="quiet">Cancel</Button>
        <Button variant="danger" icon="trash">
          Void sale
        </Button>
      </div>
      <div className="bp-row">
        <Button variant="primary" size="lg">
          Pay {formatPeso(37350)}
        </Button>
        <Button variant="primary" loading>
          Saving sale
        </Button>
        <Button disabled>Close register</Button>
        <Button size="sm">Edit product</Button>
      </div>
    </div>
  ),
};

export const iconButtonSection: GallerySection = {
  id: 'icon-button',
  title: 'IconButton',
  preview: 'InventoryScreen',
  render: () => (
    <div className="bp-drawer">
      <div className="bp-drawer__head">
        <div>
          <h3 className="bp-card__title">Fresh milk</h3>
          <span className="bp-note">1 L box. Ingredient in 9 products</span>
        </div>
        <IconButton icon="x" label="Close" />
      </div>
      <div className="bp-drawer__head">
        <div>
          <h3 className="bp-card__title">Dairy Fresh Davao</h3>
          <span className="bp-note">Supplier since Mar 2026</span>
        </div>
        <IconButton icon="edit" label="Edit supplier" />
      </div>
    </div>
  ),
};
