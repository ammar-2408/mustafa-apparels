import { fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Button, buttonClass } from './button';

describe('Button', () => {
  it('is a plain button unless told to submit, so it never sends a form by accident', () => {
    render(
      <form>
        <Button>Save</Button>
        <Button type="submit">Send</Button>
      </form>,
    );
    expect(screen.getByRole('button', { name: 'Save' }).getAttribute('type')).toBe('button');
    expect(screen.getByRole('button', { name: 'Send' }).getAttribute('type')).toBe('submit');
  });

  it('runs its click handler', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('ignores clicks while disabled', () => {
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Save
      </Button>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('passes a ref and extra attributes to the button', () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <Button ref={ref} aria-label="Add to wishlist">
        +
      </Button>,
    );
    expect(ref.current).toBe(screen.getByRole('button', { name: 'Add to wishlist' }));
  });

  it('gives a link the same look as the button, for WhatsApp and call links', () => {
    render(
      <>
        <Button variant="secondary">Call</Button>
        <a href="tel:+920000000000" className={buttonClass('secondary')}>
          Call
        </a>
      </>,
    );
    expect(screen.getByRole('link', { name: 'Call' }).className).toBe(
      screen.getByRole('button', { name: 'Call' }).className,
    );
  });

  it('looks different for primary and secondary, and is primary by default', () => {
    expect(buttonClass('primary')).not.toBe(buttonClass('secondary'));
    expect(buttonClass()).toBe(buttonClass('primary'));
  });

  it('ends every hover the same way: ink with white text, lifted; orange stays out', () => {
    expect(buttonClass('primary')).toContain('bg-action text-action-fg');
    expect(buttonClass('primary')).not.toMatch(/hover:bg-transparent/);
    expect(buttonClass('secondary')).toContain('hover:bg-action hover:text-action-fg');
    for (const variant of ['primary', 'secondary'] as const) {
      expect(buttonClass(variant)).toMatch(/\blift\b/);
      expect(buttonClass(variant)).toContain('rounded-md');
    }
    expect(buttonClass('primary') + buttonClass('secondary')).not.toMatch(/accent/);
  });

  it('can set its label in Bold sentence case instead of spaced capitals', () => {
    const bold = buttonClass('primary', undefined, 'bold');
    expect(bold).toContain('font-bold');
    expect(bold).not.toMatch(/\bcaps/);
    expect(buttonClass('primary')).toMatch(/\bcaps/);
    expect(buttonClass('secondary', 'w-full', 'bold').endsWith(' w-full')).toBe(true);
  });

  it('has deep green variants for the home hero, with the same lift as every button', () => {
    expect(buttonClass('deep')).toContain('bg-deep text-action-fg');
    expect(buttonClass('deep-outline')).toContain('border-deep');
    expect(buttonClass('deep-outline')).toContain('text-deep');
    expect(buttonClass('deep-outline')).toContain('hover:bg-deep hover:text-action-fg');
    for (const variant of ['deep', 'deep-outline'] as const) {
      expect(buttonClass(variant)).toMatch(/\blift\b/);
    }
  });

  it('keeps extra classes after its own', () => {
    expect(buttonClass('primary', 'w-full').endsWith(' w-full')).toBe(true);
  });
});
