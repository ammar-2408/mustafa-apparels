import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/font/google', () => ({
  DM_Serif_Display: () => ({ variable: 'font-dm-serif-var', className: 'dm-serif' }),
}));

import { Part, StaticPage } from './static-page';

const art = {
  src: 'https://res.cloudinary.com/ma/image/upload/c_limit/site/pages/about',
  alt: 'Fabric',
};

describe('StaticPage', () => {
  it('shows the breadcrumb, a serif title with its coloured last word, the lead and the picture', () => {
    render(
      <StaticPage title="About" accent="Us" path="/about" lead="An online shop." art={art}>
        <Part title="What We Sell">
          <p>Suits.</p>
        </Part>
      </StaticPage>,
    );
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(nav).getByRole('link', { name: 'Home' }).getAttribute('href')).toBe('/');
    expect(within(nav).getByText('About Us').getAttribute('aria-current')).toBe('page');
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1.textContent).toBe('About Us');
    expect(h1.className).toContain('font-serif');
    expect(h1.querySelector('.text-accent-text')!.textContent).toBe('Us');
    expect(document.body.textContent).toContain('An online shop.');
    // The picture is decoration (twice: the wide arch and the phone band), never announced.
    for (const img of document.querySelectorAll('img')) {
      expect(img.getAttribute('alt')).toBe('');
      expect(img.closest('[aria-hidden="true"]')).not.toBeNull();
    }
    expect(document.querySelectorAll('img').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { level: 2, name: 'What We Sell' }).className).toContain(
      'font-serif',
    );
  });

  it('works with no coloured word and no picture (Privacy, Terms)', () => {
    render(
      <StaticPage title="Privacy" path="/privacy">
        <p>Text</p>
      </StaticPage>,
    );
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Privacy');
    expect(document.querySelector('img')).toBeNull();
  });
});
