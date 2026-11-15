'use client';

import { whatsappLink } from '@mustafa/core/contact-links';
import { Dialog } from '@mustafa/ui/dialog';
import { Logo } from '@mustafa/ui/logo';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { GENERAL_WHATSAPP_TEXT, HELP_LINKS, type NavLink } from '../../lib/nav';
import { HeaderLogo } from '../logo';
import { type Contact, ContactList } from './contact-list';
import { AccountIcon, MenuIcon, SearchIcon, WhatsAppIcon } from './icons';

type Props = { links: NavLink[]; contact: Contact };

// A 44px icon control with a visible label from sm, so phones keep the header on one line.
const control =
  'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-sm px-2 text-fg';
const label = 'caps-tight hidden sm:inline';

// The header band, the floating bar that takes over once it scrolls away, and the side-panel menu.
// No session read: Account is a plain link, so cached pages stay free of per-user work.
export function HeaderBar({ links, contact }: Props) {
  const [open, setOpen] = useState(false);
  const [floating, setFloating] = useState(false);
  const bandRef = useRef<HTMLElement>(null);
  // The button that opened the menu (the header's or the floating bar's), to give focus back to.
  const opener = useRef<HTMLButtonElement | null>(null);
  const pathname = usePathname();

  // Moving to another page closes the menu.
  const [shownFor, setShownFor] = useState(pathname);
  if (shownFor !== pathname) {
    setShownFor(pathname);
    setOpen(false);
  }

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

  const actions = (
    <>
      <Link href="/search" className={control} aria-label="Search">
        <SearchIcon />
      </Link>
      <Link href="/account" className={control} aria-label="Account">
        <AccountIcon />
      </Link>
      {whatsapp && (
        <a href={whatsapp} className={control} target="_blank" rel="noopener">
          <WhatsAppIcon />
          <span className={label}>WhatsApp</span>
          <span className="sr-only sm:hidden">WhatsApp</span>
        </a>
      )}
      <button
        type="button"
        className={control}
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

  return (
    <>
      <header ref={bandRef} className="bg-primary text-primary-fg">
        <div className="mx-auto flex max-w-content-wide items-center justify-between gap-4 px-gutter py-3 md:py-4">
          <HeaderLogo />
          <nav aria-label="Quick links" className="flex items-center gap-1 sm:gap-2">
            {actions}
          </nav>
        </div>
      </header>

      {/* The floating bar: frosted from md, solid on phones (blur is slow there). */}
      <div
        aria-hidden={!floating}
        inert={!floating}
        data-floating={floating}
        className="invisible fixed inset-x-0 top-0 z-40 -translate-y-full bg-bg shadow-soft transition-[translate,visibility] duration-300 data-[floating=true]:visible data-[floating=true]:translate-y-0 motion-reduce:transition-none md:bg-bg/85 md:backdrop-blur"
      >
        <div className="mx-auto flex max-w-content-wide items-center justify-between gap-4 px-gutter py-2">
          <Link
            href="/"
            aria-label="Mustafa Apparels home"
            className="inline-flex min-h-11 items-center"
          >
            <Logo variant="simplified" height={28} />
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">{actions}</div>
        </div>
      </div>

      <Dialog
        open={open}
        onClose={close}
        title="Menu"
        className="mr-0 h-dvh max-h-none w-full! max-w-md! rounded-none backdrop:bg-fg/40 md:backdrop:bg-fg/30 md:backdrop:backdrop-blur-sm"
      >
        <nav aria-label="Main">
          <ul className="flex flex-col gap-1">
            {links.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={close}
                  className="block py-2 text-h2 font-light hover:underline hover:decoration-accent"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
            {HELP_LINKS.filter((l) => !links.some((m) => m.href === l.href)).map((link) => (
              <li key={link.href}>
                <Link href={link.href} onClick={close} className="link inline-block py-2">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-12 border-t border-border pt-8">
          <ContactList contact={contact} />
        </div>
      </Dialog>
    </>
  );
}
