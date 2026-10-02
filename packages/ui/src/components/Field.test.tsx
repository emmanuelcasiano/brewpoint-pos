import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Field } from './Field';
import { Select } from './Select';
import { TextInput } from './TextInput';

describe('Field', () => {
  it('ties the label to the input and describes it with the help text', () => {
    render(
      <Field label="Product name" help="Shown on the tile and the receipt.">
        <TextInput defaultValue="Iced Latte" />
      </Field>,
    );
    const input = screen.getByLabelText('Product name');

    expect(input).toHaveClass('bp-input');
    expect(input).toHaveAccessibleDescription('Shown on the tile and the receipt.');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('shows the error with the alert icon, sets aria-invalid and describes the input', () => {
    const { container } = render(
      <Field label="Email" error="Enter an email like name@shop.com">
        <TextInput defaultValue="ana@kape" />
      </Field>,
    );
    const input = screen.getByLabelText('Email');

    expect(container.firstChild).toHaveClass('bp-field', 'bp-field--error');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Enter an email like name@shop.com');
    expect(container.querySelector('.bp-field__error svg.bp-icon')).toBeInTheDocument();
  });

  it('uses the id it is given', () => {
    render(
      <Field label="Device code" id="device-code">
        <TextInput />
      </Field>,
    );
    expect(screen.getByLabelText('Device code')).toHaveAttribute('id', 'device-code');
  });

  it('passes disabled to the input', () => {
    render(
      <Field label="Device code" help="Set when the device was registered.">
        <TextInput defaultValue="T1" disabled />
      </Field>,
    );
    expect(screen.getByLabelText('Device code')).toBeDisabled();
  });

  it('labels a select and gives it the select classes', () => {
    render(
      <Field label="Reason for waste" error="Choose a reason">
        <Select defaultValue="Expired">
          <option>Spilled</option>
          <option>Expired</option>
        </Select>
      </Field>,
    );
    const select = screen.getByLabelText('Reason for waste');

    expect(select).toHaveClass('bp-input', 'bp-select');
    expect(select).toHaveValue('Expired');
    expect(select).toHaveAttribute('aria-invalid', 'true');
  });
});
