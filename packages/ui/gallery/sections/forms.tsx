import type { GallerySection } from '../Specimen';
import { CashField, SettingsRows } from './form-demos';
import { Checkbox, Field, Select, TextInput } from '../../src';

export const fieldSection: GallerySection = {
  id: 'field',
  title: 'Field, MoneyInput, Select, Checkbox',
  preview: 'Field',
  render: () => (
    <div className="grid max-w-[760px] grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-6">
      <div className="bp-stack">
        <Field label="Product name" help="Shown on the tile and the receipt.">
          <TextInput defaultValue="Iced Latte" />
        </Field>
        <Field label="Email" error="Enter an email like name@shop.com">
          <TextInput defaultValue="ana@kape" />
        </Field>
        <Checkbox label="Skip expired containers when deducting stock" defaultChecked />
      </div>
      <div className="bp-stack">
        <CashField />
        <Field label="Reason for waste">
          <Select defaultValue="Spilled">
            <option>Spilled</option>
            <option>Expired</option>
            <option>Staff meal</option>
          </Select>
        </Field>
        <Field label="Device code" help="Set when the device was registered.">
          <TextInput defaultValue="T1" disabled />
        </Field>
      </div>
    </div>
  ),
};

export const switchSection: GallerySection = {
  id: 'switch',
  title: 'Switch',
  preview: 'SettingsScreen',
  render: () => <SettingsRows />,
};
