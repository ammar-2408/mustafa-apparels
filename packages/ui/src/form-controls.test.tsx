import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Checkbox } from './checkbox';
import { FieldLook } from './field';
import { Input } from './input';
import { Select } from './select';
import { Textarea } from './textarea';

const describedBy = (el: HTMLElement) =>
  (el.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent);

describe('Textarea', () => {
  it('is labelled, reads out hint then error, and marks itself invalid', () => {
    render(<Textarea label="Description" hint="1–2 sentences" error="Too long" />);
    const field = screen.getByLabelText('Description');
    expect(field.tagName).toBe('TEXTAREA');
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(describedBy(field)).toEqual(['1–2 sentences', 'Too long']);
  });

  it('counts characters against maxLength when asked, and still calls onChange', () => {
    const onChange = vi.fn();
    render(
      <Textarea
        label="Alt text"
        maxLength={200}
        showCount
        defaultValue="abc"
        onChange={onChange}
      />,
    );
    expect(screen.getByText('3 / 200')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Alt text'), { target: { value: 'abcdef' } });
    expect(screen.getByText('6 / 200')).toBeTruthy();
    expect(onChange).toHaveBeenCalled();
  });

  it('shows no count unless asked', () => {
    render(<Textarea label="Notes" maxLength={50} />);
    expect(screen.queryByText('0 / 50')).toBeNull();
  });
});

describe('Select', () => {
  const options = [
    { value: 'summer', label: 'Summer' },
    { value: 'winter', label: 'Winter' },
  ];

  it('is a labelled native select with the given choices', () => {
    render(<Select label="Season" name="season" options={options} />);
    const select = screen.getByLabelText('Season') as HTMLSelectElement;
    expect(select.tagName).toBe('SELECT');
    expect([...select.options].map((o) => o.textContent)).toEqual(['Summer', 'Winter']);
  });

  it('starts with an empty choice when given a placeholder', () => {
    render(<Select label="Season" options={options} placeholder="Any" />);
    const select = screen.getByLabelText('Season') as HTMLSelectElement;
    expect(select.options[0]?.value).toBe('');
    expect(select.options[0]?.textContent).toBe('Any');
  });

  it('reads out its error', () => {
    render(<Select label="Season" options={options} error="Choose a season" />);
    expect(describedBy(screen.getByLabelText('Season'))).toEqual(['Choose a season']);
  });
});

describe('Checkbox', () => {
  it('is labelled, toggles, and reads out its hint', () => {
    render(<Checkbox label="Needs price" hint="Drafts with no price" name="needsPrice" />);
    const box = screen.getByRole('checkbox', { name: 'Needs price' }) as HTMLInputElement;
    expect(box.checked).toBe(false);
    fireEvent.click(box);
    expect(box.checked).toBe(true);
    expect(describedBy(box)).toEqual(['Drafts with no price']);
  });
});

// The admin (owner, 2026-11-22): every field takes the storefront's card look, set once.
describe('FieldLook', () => {
  it('gives every field inside it the card look: Bold deep green label, rounder field', () => {
    render(
      <FieldLook look="card">
        <Input label="Name" />
        <Select label="Fabric" options={[{ value: 'dhanak', label: 'Dhanak' }]} />
        <Textarea label="Care" />
      </FieldLook>,
    );
    for (const name of ['Name', 'Fabric', 'Care']) {
      const label = screen.getByText(name);
      expect(label.className, name).toContain('font-bold');
      expect(label.className, name).toContain('text-deep');
      const control = screen.getByLabelText(name);
      expect(control.className, name).toContain('rounded-md');
      expect(control.className, name).not.toContain('rounded-sm');
    }
  });

  it('leaves fields outside it plain', () => {
    render(<Select label="Fabric" options={[]} />);
    expect(screen.getByText('Fabric').className).toContain('caps-tight');
  });
});
