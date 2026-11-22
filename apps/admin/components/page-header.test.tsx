import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/font/google', () => ({
  DM_Serif_Display: () => ({ variable: 'font-dm-serif-var', className: 'dm-serif' }),
}));

import { PageHeader } from './page-header';

// The storefront's page title in the admin (owner, 2026-11-22).
describe('PageHeader', () => {
  it('shows the title in the deep green serif, with the eyebrow, subtitle and action', () => {
    render(
      <PageHeader
        title="Suits"
        eyebrow="DHN-01"
        subtitle="Every suit in the shop."
        action={<button type="button">New suit</button>}
      />,
    );
    const h1 = screen.getByRole('heading', { level: 1, name: 'Suits' });
    expect(h1.className).toContain('font-serif');
    expect(h1.className).toContain('text-deep');
    expect(document.body.textContent).toContain('DHN-01');
    expect(document.body.textContent).toContain('Every suit in the shop.');
    expect(screen.getByRole('button', { name: 'New suit' })).toBeTruthy();
  });

  it('needs only a title', () => {
    render(<PageHeader title="Settings" />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Settings');
  });
});
