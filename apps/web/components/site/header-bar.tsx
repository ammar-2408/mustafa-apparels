'use client';

import { whatsappLink } from '@mustafa/core/contact-links';
import { Dialog } from '@mustafa/ui/dialog';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type CSSProperties, useEffect, useRef, useState } from 'react';

import { GENERAL_WHATSAPP_TEXT, HELP_LINKS, type NavLink } from '../../lib/nav';
import { HeaderLogo } from '../logo';
import { SearchBox } from '../search/search-box';
import { type Contact, ContactList } from './contact-list';
import { FlowerSprig, LeafBranch, Swash } from './flourish';
import {
  AccountIcon,
  BagIcon,
  ChevronIcon,
  collectionIcon,
  HeartIcon,
  LayersIcon,
  MenuIcon,
  SearchIcon,
  WhatsAppIcon,
} from './icons';
import { MainNav } from './main-nav';
import { OPEN_SEARCH } from './open-search';

type Props = { links: NavLink[]; contact: Contact };

// Each menu row's icon: the collection's own, folded fabric for All suits, a bag for How to Order.
function menuIcon(href: string) {
  if (href.startsWith('/collections/'))
    return collectionIcon(href.slice('/collections/'.length), 'menu');
  return href === '/how-to-order' ? BagIcon : LayersIcon;
}

// A 44px icon control with a visible label from sm, so phones keep the header on one line.
const control =
  'header-control inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-sm px-2 text-fg';
const label = 'control-label hidden text-body sm:inline';
// The Search, Account and Saved tiles in the menu panel.
const tile =
  'flex min-h-16 w-full flex-col items-center justify-center gap-1 rounded-md border border-border text-small hover:bg-surface-soft';
// The WhatsApp word only from xl: between lg and xl the bar also holds the main links.
const whatsappLabel = 'control-label hidden text-body xl:inline';

// The header band, the floating bar that takes over once it scrolls away, and the side-panel menu.
// No session read: Account is a plain link, so cached pages stay free of per-user work.
export function HeaderBar({ links, contact }: Props) {
  const [open, setOpen] = useState(false);
  const [floating, setFloating] = useState(false);
  // The search box (owner, 2026-11-22: no search page). Mounted on first use only.
  const [searching, setSearching] = useState(false);
  const [searchUsed, setSearchUsed] = useState(false);
  const searchOpener = useRef<HTMLElement | null>(null);
  const bandRef = useRef<HTMLElement>(null);
  // The button that opened the menu (the header's or the floating bar's), to give focus back to.
  const opener = useRef<HTMLButtonElement | null>(null);
  const pathname = usePathname();

  // Moving to another page closes the menu.
  const [shownFor, setShownFor] = useState(pathname);
  if (shownFor !== pathname) {
    setShownFor(pathname);
    setOpen(false);
    setSearching(false);
  }

  const startSearch = (from: HTMLElement | null) => {
    searchOpener.current = from;
    setOpen(false);
    setSearchUsed(true);
    setSearching(true);
  };
  const closeSearch = () => {
    setSearching(false);
    searchOpener.current?.focus();
  };

  // Anything on the page can open the search box (open-search.tsx).
  useEffect(() => {
    const onOpen = () => {
      searchOpener.current = null;
      setOpen(false);
      setSearchUsed(true);
      setSearching(true);
    };
    window.addEventListener(OPEN_SEARCH, onOpen);
    return () => window.removeEventListener(OPEN_SEARCH, onOpen);
  }, []);

  useEffect(() => {
    const band = bandRef.current;
    if (!band || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(([entry]) => setFloating(!entry!.isIntersecting));
    observer.observe(band);
    return () => observer.disconnect();
  }, []);

  const whatsapp = contact.whatsapp ? whatsappLink(contact.whatsapp, GENERAL_WHATSAPP_TEXT) : null;
  // Safari doesn't focus a button on click, so the dialog has nothing to return focus to: do it here.
  const close = () => {
    setOpen(false);
    opener.current?.focus();
  };

  const collections = links.filter((link) => link.href.startsWith('/collections/'));

  const actions = (
    <>
      <span aria-hidden="true" className="mr-3 hidden h-8 w-px bg-fg/30 lg:block" />
      <button
        type="button"
        className={`${control} max-[359px]:hidden`}
        aria-label="Search"
        aria-haspopup="dialog"
        aria-expanded={searching}
        onClick={(event) => startSearch(event.currentTarget)}
      >
        <SearchIcon />
      </button>
      <Link href="/account" className={`${control} max-md:hidden`} aria-label="Account">
        <AccountIcon />
      </Link>
      {whatsapp && (
        <a href={whatsapp} className={control} target="_blank" rel="noopener">
          <WhatsAppIcon />
          <span className={whatsappLabel}>WhatsApp</span>
          <span className="sr-only xl:hidden">WhatsApp</span>
        </a>
      )}
      <Link href="/account#saved" className={`${control} max-md:hidden`} aria-label="Saved suits">
        <HeartIcon />
      </Link>
      {/* Phones and tablets open the side panel; from lg the links sit in the bar instead. */}
      <button
        type="button"
        className={`${control} lg:hidden`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={(event) => {
          opener.current = event.currentTarget;
          setOpen(true);
        }}
      >
        <MenuIcon />
        <span className={label}>Menu</span>
        <span className="sr-only sm:hidden">Menu</span>
      </button>
    </>
  );

  // The navbar (the owner's mockup, 2026-11-15): powder blue with a soft wave and a leaf. The bar
  // itself doesn't clip, so the Collections list can hang below it over the page; only the
  // decoration layer clips its wave and leaf. The floating bar is the same band (owner, 2026-11-17).
  const band = (floatingCopy: boolean) => (
    <>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <svg
          viewBox="0 0 1440 40"
          preserveAspectRatio="none"
          className="absolute bottom-0 left-0 h-5 w-full fill-bg/25"
        >
          <path d="M0 40V26c180-24 380-26 560-8s360 20 540 2 260-18 340-12v32z" />
        </svg>
        <LeafBranch className="absolute top-1 -right-4 hidden w-24 2xl:block" />
      </div>
      <div className="relative mx-auto flex h-16 max-w-content-wide items-center justify-between gap-4 px-gutter md:h-20 lg:h-24">
        <HeaderLogo />
        <div className="hidden lg:block">
          <MainNav
            collections={collections}
            pathname={pathname}
            label={floatingCopy ? 'Primary, on scroll' : undefined}
          />
        </div>
        {/* One "Quick links" landmark: the floating copy is a plain group. */}
        {floatingCopy ? (
          <div className="flex shrink-0 items-center gap-1 sm:gap-2 2xl:pr-20">{actions}</div>
        ) : (
          <nav
            aria-label="Quick links"
            className="flex shrink-0 items-center gap-1 sm:gap-2 2xl:pr-20"
          >
            {actions}
          </nav>
        )}
      </div>
    </>
  );

  return (
    <>
      <header ref={bandRef} className="relative z-30 bg-primary text-primary-fg">
        {band(false)}
      </header>

      {/* The floating bar: the same band, sliding in once the header scrolls away. */}
      <div
        aria-hidden={!floating}
        inert={!floating}
        data-floating={floating}
        className="invisible fixed inset-x-0 top-0 z-40 -translate-y-full bg-primary text-primary-fg shadow-soft transition-[translate,visibility] duration-300 data-[floating=true]:visible data-[floating=true]:translate-y-0 motion-reduce:transition-none"
      >
        {band(true)}
      </div>

      {/* The side panel (the owner's mockup, 2026-11-15). No blur behind it: it's slow on phones. */}
      <Dialog
        open={open}
        onClose={close}
        title="Menu"
        className="menu-panel mr-0 h-dvh max-h-none w-full! max-w-md! rounded-none bg-linear-to-b from-bg from-60% to-surface-soft backdrop:bg-fg/40"
      >
        <span aria-hidden="true">
          <FlowerSprig className="sway absolute top-16 right-0 w-24" />
          {/* Flipped on a wrapper, so the sway can turn the drawing from its own stem. */}
          <span className="absolute right-0 bottom-0 hidden w-40 -scale-y-100 sm:block">
            <FlowerSprig className="sway w-full" />
          </span>
        </span>
        <nav aria-label="Main" className="relative">
          <ul className="flex flex-col">
            {links.map((link, i) => {
              const current = pathname === link.href ? 'page' : undefined;
              // The first link (New arrivals) is the panel's big heading; the rest are rows.
              if (i === 0) {
                return (
                  <li
                    key={link.href}
                    className="menu-item mb-6"
                    style={{ '--i': i } as CSSProperties}
                  >
                    <Link
                      href={link.href}
                      onClick={close}
                      aria-current={current}
                      className="inline-flex flex-col py-1 text-h2 font-bold"
                    >
                      {link.label}
                      <Swash className="mt-1 h-3 w-40" />
                    </Link>
                  </li>
                );
              }
              const Icon = menuIcon(link.href);
              return (
                <li
                  key={link.href}
                  className="menu-item border-b border-border"
                  style={{ '--i': i } as CSSProperties}
                >
                  <Link
                    href={link.href}
                    onClick={close}
                    aria-current={current}
                    className="menu-row flex min-h-14 items-center gap-4 py-2 text-body-lg font-bold aria-[current=page]:text-accent-text"
                  >
                    <Icon className="size-7" />
                    {link.label}
                    <ChevronIcon className="nudge ml-auto size-5" />
                  </Link>
                </li>
              );
            })}
          </ul>
          <ul className="mt-6 grid grid-cols-3 gap-2">
            <li>
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => startSearch(opener.current)}
                className={tile}
              >
                <SearchIcon className="size-6" />
                Search
              </button>
            </li>
            {[
              { href: '/account', label: 'Account', Icon: AccountIcon },
              { href: '/account#saved', label: 'Saved', Icon: HeartIcon },
            ].map(({ href, label: name, Icon }) => (
              <li key={href}>
                <Link href={href} onClick={close} className={tile}>
                  <Icon className="size-6" />
                  {name}
                </Link>
              </li>
            ))}
          </ul>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
            {HELP_LINKS.filter((l) => !links.some((m) => m.href === l.href)).map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={close}
                  className="link inline-block py-2 text-small"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="relative mt-8 border-t border-border pt-8">
          <ContactList contact={contact} bold />
        </div>
      </Dialog>

      {searchUsed && (
        <Dialog
          open={searching}
          onClose={closeSearch}
          title="Search suits"
          className="search-panel mt-0 mb-auto w-full! max-w-none! rounded-none rounded-b-lg bg-linear-to-b from-bg to-surface-soft backdrop:bg-fg/40"
        >
          <div className="mx-auto w-full max-w-3xl">
            <SearchBox focusOnOpen={searching} />
          </div>
        </Dialog>
      )}
    </>
  );
}
