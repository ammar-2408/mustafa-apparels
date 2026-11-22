import { fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Button, ButtonCircle, buttonClass } from './button';

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

  // The owner's button-template.png (2026-11-22): every button but the home hero pair is the
  // glossy green pill with white Bold spaced capitals and a round arrow on the right.
  it('makes primary and secondary the same glossy green pill, primary by default', () => {
    expect(buttonClass()).toBe(buttonClass('primary'));
    for (const variant of ['primary', 'secondary'] as const) {
      const cls = buttonClass(variant);
      expect(cls).toMatch(/\bbtn-3d\b/);
      expect(cls).toContain('rounded-full');
      expect(cls).toContain('bg-deep text-action-fg');
      expect(cls).toContain('font-bold uppercase');
      // The 3D hover replaces the old lift, and orange stays out.
      expect(cls).not.toMatch(/\blift\b/);
      expect(cls).not.toMatch(/accent/);
    }
    expect(buttonClass('primary')).toBe(buttonClass('secondary'));
  });

  it('is 56px tall, or the height of the field it sits beside', () => {
    expect(buttonClass('primary')).toContain('min-h-14');
    const beside = buttonClass('primary', 'min-h-12');
    expect(beside).toContain('min-h-12');
    expect(beside).not.toContain('min-h-14');
  });

  it('keeps the template label even when asked for Bold sentence case', () => {
    expect(buttonClass('primary', undefined, 'bold')).toBe(buttonClass('primary'));
  });

  it('ends with the round arrow, hidden from screen readers, so the name is the label', () => {
    render(<Button>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    const circles = button.querySelectorAll('.btn-circle');
    expect(circles).toHaveLength(1);
    expect(circles[0]!.getAttribute('aria-hidden')).toBe('true');
    expect(circles[0]!.querySelector('svg')).toBeTruthy();
    expect(button.lastElementChild).toBe(circles[0]);
  });

  it('puts its own icon in the circle instead of the arrow', () => {
    render(<Button icon={<svg data-testid="phone" />}>Call</Button>);
    const circle = screen.getByRole('button', { name: 'Call' }).querySelector('.btn-circle')!;
    expect(circle.querySelector('[data-testid="phone"]')).toBeTruthy();
    expect(circle.querySelectorAll('svg')).toHaveLength(1);
  });

  it('points the arrow back for Previous', () => {
    const { container } = render(<ButtonCircle direction="back" />);
    expect(container.querySelector('svg')!.getAttribute('class')).toContain('rotate-180');
    const forward = render(<ButtonCircle />).container.querySelector('svg')!;
    expect(forward.getAttribute('class')).not.toContain('rotate-180');
  });

  it('keeps the home hero pair deep green, with its own hover fill', () => {
    expect(buttonClass('deep')).toContain('bg-deep text-action-fg');
    expect(buttonClass('deep-outline')).toContain('border-deep');
    expect(buttonClass('deep-outline')).toContain('text-deep');
    // The hover fill (owner, 2026-11-17): ink over deep green, deep green over the outline.
    expect(buttonClass('deep')).toContain('[--sweep:var(--color-action)]');
    expect(buttonClass('deep-outline')).toContain('[--sweep:var(--color-deep)]');
    // The fill does the hover, so the background never flips at once underneath it.
    expect(buttonClass('deep-outline')).not.toContain('hover:bg-deep');
    for (const variant of ['deep', 'deep-outline'] as const) {
      expect(buttonClass(variant)).toMatch(/\blift\b/);
      expect(buttonClass(variant)).toMatch(/\bsweep\b/);
      expect(buttonClass(variant)).not.toMatch(/\bbtn-3d\b/);
    }
  });

  it('keeps extra classes after its own', () => {
    expect(buttonClass('primary', 'w-full').endsWith(' w-full')).toBe(true);
  });
});
