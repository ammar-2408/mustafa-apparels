import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));

import { menuLinks } from '../../lib/nav';
import { displayNumber } from './contact-list';
import { FooterView } from './footer-view';
import { HeaderBar } from './header-bar';

const contact = { whatsapp: '+923482799707', phone: '+923069558717', email: 'shop@example.com' };
const links = menuLinks([{ slug: 'dhanak', name: 'Dhanak' }]);

describe('HeaderBar', () => {
  it('has the home link, search, account, WhatsApp and a menu button', () => {
    render(<HeaderBar links={links} contact={contact} />);
    const band = screen.getByRole('banner');
    expect(within(band).getByRole('link', { name: 'Mustafa Apparels home' })).toBeTruthy();
    expect(within(band).getByRole('link', { name: 'Search' }).getAttribute('href')).toBe('/search');
    expect(within(band).getByRole('link', { name: 'Account' }).getAttribute('href')).toBe(
      '/account',
    );
    const whatsapp = within(band).getByRole('link', { name: /WhatsApp/ });
    expect(whatsapp.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/923482799707\?text=/);
    const menu = within(band).getByRole('button', { name: /Menu/ });
    expect(menu.getAttribute('aria-expanded')).toBe('false');
  });

  it('leaves out WhatsApp when the shop has no number set', () => {
    render(<HeaderBar links={links} contact={{ whatsapp: null, phone: null, email: null }} />);
    expect(within(screen.getByRole('banner')).queryByRole('link', { name: /WhatsApp/ })).toBeNull();
  });

  it('keeps the floating bar out of reach until the header scrolls away', () => {
    const { container } = render(<HeaderBar links={links} contact={contact} />);
    const bar = container.querySelector('[data-floating]')!;
    expect(bar.getAttribute('data-floating')).toBe('false');
    expect(bar.hasAttribute('inert')).toBe(true);
  });
});

describe('FooterView', () => {
  const shop = [{ href: '/shop', label: 'All suits' }];

  it('shows the shop, help and legal links and the logo, with no social row when none are set', () => {
    render(<FooterView shop={shop} socials={[]} serviceArea={null} />);
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByRole('img', { name: 'MA Apparels by Mustafa Ahmed' })).toBeTruthy();
    for (const name of ['All suits', 'How to Order', 'FAQ', 'Privacy', 'Terms']) {
      expect(within(footer).getByRole('link', { name })).toBeTruthy();
    }
    expect(within(footer).queryByRole('heading', { name: 'Follow' })).toBeNull();
    expect(footer.textContent).toContain('Courier delivery across Pakistan');
  });

  it('lists the social profiles that are set, opening in a new tab', () => {
    render(
      <FooterView
        shop={shop}
        socials={[{ href: 'https://instagram.com/ma', label: 'Instagram' }]}
        serviceArea="every city in Pakistan"
      />,
    );
    const link = screen.getByRole('link', { name: 'Instagram' });
    expect(link.getAttribute('target')).toBe('_blank');
    expect(screen.getByRole('contentinfo').textContent).toContain(
      'Courier delivery across every city in Pakistan.',
    );
  });
});

it('shows a Pakistani number with spaces', () => {
  expect(displayNumber('+923069558717')).toBe('+92 306 9558717');
});
