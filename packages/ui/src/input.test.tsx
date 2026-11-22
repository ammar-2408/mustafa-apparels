import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Input } from './input';

const describedBy = (input: HTMLElement) =>
  (input.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent);

describe('Input', () => {
  it('is labelled by its visible label', () => {
    render(<Input label="Phone" name="phone" />);
    expect(screen.getByLabelText('Phone').getAttribute('name')).toBe('phone');
  });

  it('gives two fields their own ids', () => {
    render(
      <>
        <Input label="Name" />
        <Input label="Phone" />
      </>,
    );
    expect(screen.getByLabelText('Name').id).not.toBe(screen.getByLabelText('Phone').id);
  });

  it('keeps an id it is given', () => {
    render(<Input label="Email" id="email" />);
    expect(screen.getByLabelText('Email').id).toBe('email');
  });

  it('reads out its hint', () => {
    render(<Input label="Phone" hint="We reply on WhatsApp" />);
    expect(describedBy(screen.getByLabelText('Phone'))).toEqual(['We reply on WhatsApp']);
  });

  it('is valid and points to no error until it has one', () => {
    render(<Input label="Phone" />);
    const input = screen.getByLabelText('Phone');
    expect(input.getAttribute('aria-invalid')).toBeNull();
    expect(input.getAttribute('aria-describedby')).toBeNull();
  });

  it('marks itself invalid and reads out the error after the hint', () => {
    render(<Input label="Phone" hint="We reply on WhatsApp" error="Enter a phone number" />);
    const input = screen.getByLabelText('Phone');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(describedBy(input)).toEqual(['We reply on WhatsApp', 'Enter a phone number']);
  });

  it('announces an error in a live region that was already on the page', () => {
    const { container, rerender } = render(<Input label="Phone" />);
    const region = container.querySelector('[aria-live="polite"]');
    expect(region?.textContent).toBe('');
    rerender(<Input label="Phone" error="Enter a phone number" />);
    expect(container.querySelector('[aria-live="polite"]')).toBe(region);
    expect(region?.textContent).toBe('Enter a phone number');
  });
  // The sign-up and login cards (owner's NEWSIGNUP.png and NEWLOGIN.png, 2026-11-22).
  it('can show an icon inside the field, hidden from screen readers', () => {
    const { container } = render(<Input label="Email" icon={<svg data-testid="mail" />} />);
    const icon = screen.getByTestId('mail').parentElement!;
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('input')!.className).toContain('pl-12');
  });

  it('lets a password be shown and hidden with a labelled toggle', () => {
    render(<Input label="Password" type="password" revealable />);
    const field = screen.getByLabelText('Password') as HTMLInputElement;
    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(field.type).toBe('password');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(toggle);
    expect(field.type).toBe('text');
    expect(screen.getByRole('button', { name: 'Hide password' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('has a card look with a Bold deep green label', () => {
    render(<Input label="Email" look="card" />);
    const label = screen.getByText('Email');
    expect(label.className).toContain('font-bold');
    expect(label.className).toContain('text-deep');
    expect(screen.getByLabelText('Email').className).toContain('rounded-md');
    expect(screen.getByLabelText('Email').className).not.toContain('rounded-sm');
  });
});
