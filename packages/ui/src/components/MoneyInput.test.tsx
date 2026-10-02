import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Field } from './Field';
import { MoneyInput } from './MoneyInput';
import { formatMoneyText, isMoneyText, parseMoneyText } from './money-input-text';

function Cash({
  initial,
  onChange,
}: {
  initial: number | null;
  onChange: (v: number | null) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <Field label="Cash tendered" error={value === 0 ? 'Enter more than ₱0.00' : undefined}>
      <MoneyInput
        value={value}
        onChange={(v) => {
          setValue(v);
          onChange(v);
        }}
      />
    </Field>
  );
}

describe('money input text', () => {
  it.each([
    ['400', 40000],
    ['400.5', 40050],
    ['1,245.00', 124500],
    ['.75', 75],
    ['0', 0],
    ['', null],
    ['.', null],
    ['12a', null],
  ])('parses %j as %j centavos', (text, centavos) => {
    expect(parseMoneyText(text)).toBe(centavos);
  });

  it('formats centavos without the peso sign', () => {
    expect(formatMoneyText(124500)).toBe('1,245.00');
    expect(formatMoneyText(null)).toBe('');
  });

  it('accepts at most two decimals and ₱9,999,999.99', () => {
    expect(isMoneyText('12.34')).toBe(true);
    expect(isMoneyText('12.345')).toBe(false);
    expect(isMoneyText('9999999.99')).toBe(true);
    expect(isMoneyText('10000000')).toBe(false);
    expect(isMoneyText('-5')).toBe(false);
  });
});

describe('MoneyInput', () => {
  it('shows centavos as pesos, with the prefix outside the text and decimal input mode', () => {
    const { container } = render(<Cash initial={40000} onChange={vi.fn()} />);
    const input = screen.getByLabelText('Cash tendered');

    expect(input).toHaveValue('400.00');
    expect(input).toHaveAttribute('inputmode', 'decimal');
    expect(container.querySelector('.bp-money__prefix')).toHaveTextContent('₱');
    expect(container.querySelector('.bp-money__prefix')).toHaveAttribute('aria-hidden', 'true');
  });

  it('sends centavos out while typing and formats on blur', async () => {
    const onChange = vi.fn();
    render(<Cash initial={null} onChange={onChange} />);
    const input = screen.getByLabelText('Cash tendered');

    await userEvent.type(input, '1245.5');
    expect(onChange).toHaveBeenLastCalledWith(124550);
    expect(input).toHaveValue('1245.5');

    await userEvent.tab();
    expect(input).toHaveValue('1,245.50');
  });

  it('ignores keystrokes that cannot make an amount', async () => {
    const onChange = vi.fn();
    render(<Cash initial={null} onChange={onChange} />);
    const input = screen.getByLabelText('Cash tendered');

    await userEvent.type(input, '5x.123');
    expect(input).toHaveValue('5.12');
    expect(onChange).toHaveBeenLastCalledWith(512);
  });

  it('sends null when cleared', async () => {
    const onChange = vi.fn();
    render(<Cash initial={40000} onChange={onChange} />);
    await userEvent.clear(screen.getByLabelText('Cash tendered'));

    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('shows the field error', async () => {
    render(<Cash initial={null} onChange={vi.fn()} />);
    const input = screen.getByLabelText('Cash tendered');
    await userEvent.type(input, '0');

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Enter more than ₱0.00');
  });
});
