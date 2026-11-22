import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/font/google', () => ({
  DM_Serif_Display: () => ({ variable: 'font-dm-serif-var', className: 'dm-serif' }),
}));

import { AuthShell } from './auth-shell';

// The owner's NEWSIGNUP.png and NEWLOGIN.png (2026-11-22).
describe('AuthShell', () => {
  it('shows our logo, a serif title with its coloured word, the welcome line and the card', () => {
    render(
      <AuthShell title="Create an" accent="Account" lead="Join us." footer={<p>Already?</p>}>
        <form aria-label="Sign up" />
      </AuthShell>,
    );
    expect(screen.getByRole('img', { name: 'MA Apparels by Mustafa Ahmed' })).toBeTruthy();
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toBe('Create an Account');
    expect(h1.className).toContain('font-serif');
    expect(h1.querySelector('.text-accent-text')!.textContent).toBe('Account');
    expect(document.body.textContent).toContain('Join us.');
    expect(screen.getByRole('form', { name: 'Sign up' })).toBeTruthy();
    expect(document.body.textContent).toContain('Already?');
  });

  it('keeps every picture as decoration, never announced', () => {
    render(
      <AuthShell title="Log" accent="in" lead="Welcome back.">
        <p>Form</p>
      </AuthShell>,
    );
    const pictures = [...document.querySelectorAll('img')].filter(
      (img) => !img.getAttribute('src')?.includes('/brand/'),
    );
    expect(pictures.length).toBeGreaterThanOrEqual(3);
    for (const img of pictures) {
      expect(img.getAttribute('alt')).toBe('');
      expect(img.closest('[aria-hidden="true"]')).not.toBeNull();
    }
  });
});
