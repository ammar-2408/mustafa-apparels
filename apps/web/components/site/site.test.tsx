import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

const route = vi.hoisted(() => ({ path: '/' }));
vi.mock('next/navigation', () => ({
  usePathname: () => route.path,
  useRouter: () => ({ push: vi.fn() }),
}));

// jsdom has no showModal(); the browser's own dialog is covered by the E2E tests.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.open = false;
  };
});

import { menuLinks } from '../../lib/nav';
import { displayNumber } from './contact-list';
import { FooterView } from './footer-view';
import { HeaderBar } from './header-bar';
import { OPEN_SEARCH } from './open-search';

const contact = { whatsapp: '+923482799707', phone: '+923069558717', email: 'shop@example.com' };
const links = menuLinks([{ slug: 'dhanak', name: 'Dhanak' }]);

describe('HeaderBar', () => {
  it('has the home link, search, account, WhatsApp and a menu button', () => {
    render(<HeaderBar links={links} contact={contact} />);
    const band = screen.getByRole('banner');
    expect(within(band).getByRole('link', { name: 'Mustafa Apparels home' })).toBeTruthy();
    // Search opens a box from the navbar: there is no search page (owner, 2026-11-22).
    const search = within(band).getByRole('button', { name: 'Search' });
    expect(search.getAttribute('aria-haspopup')).toBe('dialog');
    expect(within(band).getByRole('link', { name: 'Account' }).getAttribute('href')).toBe(
      '/account',
    );
    const whatsapp = within(band).getByRole('link', { name: /WhatsApp/ });
    expect(whatsapp.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/923482799707\?text=/);
    const menu = within(band).getByRole('button', { name: /Menu/ });
    expect(menu.getAttribute('aria-expanded')).toBe('false');
  });

  it('opens the search box from the navbar, or from anywhere that asks for it', () => {
    render(<HeaderBar links={links} contact={contact} />);
    expect(screen.queryByRole('dialog', { name: 'Search suits' })).toBeNull();
    fireEvent.click(within(screen.getByRole('banner')).getByRole('button', { name: 'Search' }));
    const box = screen.getByRole('dialog', { name: 'Search suits' });
    expect(within(box).getByRole('combobox')).toBeTruthy();
    fireEvent.click(within(box).getByRole('button', { name: 'Close' }));
    expect(box.hasAttribute('open')).toBe(false);
    expect(screen.queryByRole('dialog', { name: 'Search suits' })).toBeNull();
    // The menu panel's Search tile and the 404 page open it with this event.
    act(() => {
      window.dispatchEvent(new Event(OPEN_SEARCH));
    });
    expect(screen.getByRole('dialog', { name: 'Search suits' }).hasAttribute('open')).toBe(true);
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

describe('menu panel', () => {
  const all = menuLinks([
    { slug: 'dhanak', name: 'Dhanak' },
    { slug: 'khaddar', name: 'Khaddar' },
  ]);
  const panel = () => screen.getByRole('dialog', { hidden: true });

  it('opens with New Arrivals, then each collection, All suits and How to Order, with icons', () => {
    route.path = '/';
    render(<HeaderBar links={all} contact={contact} />);
    const nav = within(panel()).getByRole('navigation', { name: 'Main', hidden: true });
    const names = within(nav)
      .getAllByRole('link', { hidden: true })
      .map((l) => l.textContent);
    expect(names.slice(0, 5)).toEqual([
      'New arrivals',
      'Dhanak',
      'Khaddar',
      'All suits',
      'How to Order',
    ]);
    // Every icon, chevron and flower is decoration.
    for (const svg of panel().querySelectorAll('svg')) {
      expect(svg.closest('[aria-hidden="true"]')).not.toBeNull();
    }
    expect(within(nav).queryAllByRole('link', { current: 'page', hidden: true })).toHaveLength(0);
  });

  it('marks the page you are on', () => {
    route.path = '/collections/khaddar';
    render(<HeaderBar links={all} contact={contact} />);
    const current = within(panel()).getAllByRole('link', { current: 'page', hidden: true });
    expect(current.map((l) => l.textContent)).toEqual(['Khaddar']);
    route.path = '/';
  });

  it('ends with WhatsApp, Call and email, leaving out any the shop has not set', () => {
    route.path = '/';
    const { unmount } = render(<HeaderBar links={all} contact={contact} />);
    expect(within(panel()).getByRole('link', { name: 'WhatsApp Us', hidden: true })).toBeTruthy();
    expect(
      within(panel()).getByRole('link', { name: 'Call +92 306 9558717', hidden: true }),
    ).toBeTruthy();
    expect(
      within(panel()).getByRole('link', { name: 'shop@example.com', hidden: true }),
    ).toBeTruthy();
    unmount();
    render(
      <HeaderBar links={all} contact={{ whatsapp: '+923482799707', phone: null, email: null }} />,
    );
    expect(within(panel()).queryByRole('link', { name: /^Call/, hidden: true })).toBeNull();
    expect(within(panel()).queryByRole('link', { name: /@/, hidden: true })).toBeNull();
  });
});

describe('FooterView', () => {
  const shop = [{ href: '/shop', label: 'All suits' }];

  it('shows the logo, the shop, help and policy links, and only true promises', () => {
    render(<FooterView shop={shop} socials={[]} serviceArea={null} whatsapp="+923482799707" />);
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).getByRole('img', { name: 'MA Apparels by Mustafa Ahmed' })).toBeTruthy();
    for (const name of [
      'All suits',
      'How to Order',
      'FAQ',
      'Contact',
      'About',
      'Privacy',
      'Terms',
    ]) {
      expect(within(footer).getByRole('link', { name })).toBeTruthy();
    }
    for (const name of ['Shop', 'Help', 'Policies', 'Stay in Touch']) {
      expect(within(footer).getByRole('heading', { name })).toBeTruthy();
    }
    expect(footer.textContent).toContain('Courier delivery across Pakistan');
    expect(footer.textContent).toContain('© Mustafa Apparels. All rights reserved.');
    // What the shop really offers today (owner, 2026-11-15): no "secure payments" or "easy returns".
    expect(footer.textContent).toContain('Pay in WhatsApp chat');
    expect(footer.textContent).toContain('Nationwide Delivery');
    expect(footer.textContent).toContain('Unstitched, ready to tailor');
    expect(footer.textContent).not.toMatch(/Secure Payments|Easy Returns/);
    // No email sign-up yet: Stay in Touch is WhatsApp only.
    expect(within(footer).queryByRole('textbox')).toBeNull();
    expect(
      within(footer)
        .getByRole('link', { name: /Order on WhatsApp/ })
        .getAttribute('href'),
    ).toMatch(/^https:\/\/wa\.me\/923482799707/);
    expect(within(footer).queryByRole('link', { name: 'Instagram' })).toBeNull();
  });

  it('lists the social profiles that are set as icons opening in a new tab, and no WhatsApp without a number', () => {
    render(
      <FooterView
        shop={shop}
        socials={[{ href: 'https://instagram.com/ma', label: 'Instagram' }]}
        serviceArea="every city in Pakistan"
        whatsapp={null}
      />,
    );
    const link = screen.getByRole('link', { name: 'Instagram' });
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.querySelector('svg')).not.toBeNull();
    expect(screen.queryByRole('link', { name: 'Facebook' })).toBeNull();
    expect(screen.queryByRole('link', { name: /Order on WhatsApp/ })).toBeNull();
    expect(screen.getByRole('contentinfo').textContent).toContain(
      'Courier delivery across every city in Pakistan.',
    );
  });
});

it('shows a Pakistani number with spaces', () => {
  expect(displayNumber('+923069558717')).toBe('+92 306 9558717');
});
