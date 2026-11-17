'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';

import type { NavLink } from '../../lib/nav';
import { ChevronIcon, collectionIcon } from './icons';

type Props = {
  collections: NavLink[];
  pathname: string;
  /** The header's and the floating bar's lists need different names for screen readers. */
  label?: string;
};

// Ink text, Bold with an orange underline for the page you are on. Orange text would be too faint
// on powder blue (docs/brand-colours.md), so the underline carries the colour.
const item =
  'nav-link relative inline-flex min-h-11 items-center gap-1 px-1 text-body-lg data-[active=true]:font-bold';

// The navbar's links from lg (the owner's mockup, 2026-11-15): Home, a Collections list that holds
// every collection from admin (so the bar never grows), and All Suits.
export function MainNav({ collections, pathname, label = 'Primary' }: Props) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();

  // Moving to another page closes the list.
  const [shownFor, setShownFor] = useState(pathname);
  if (shownFor !== pathname) {
    setShownFor(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    // Esc closes the list and puts focus back on its button.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const current = (href: string) => (pathname === href ? 'page' : undefined);
  const inCollections = pathname.startsWith('/collections/');

  return (
    <nav aria-label={label}>
      <ul className="flex items-center gap-8 xl:gap-12">
        <li>
          <Link
            href="/"
            aria-current={current('/')}
            data-active={pathname === '/'}
            className={item}
          >
            Home
          </Link>
        </li>
        <li>
          <div ref={box} className="relative">
            <button
              ref={button}
              type="button"
              aria-expanded={open}
              aria-controls={listId}
              data-active={inCollections}
              onClick={() => setOpen((was) => !was)}
              className={item}
            >
              Collections
              <ChevronIcon
                className={`size-4 transition-transform motion-reduce:transition-none ${open ? '-rotate-90' : 'rotate-90'}`}
              />
            </button>
            {open && (
              // The owner's dropdown.png (2026-11-17): a white panel with a small pointer, one row per
              // collection with its floral icon in a pale peach circle, the name and a chevron. The
              // row under the pointer or for this page turns pale peach. New collections from admin
              // join the list with a drawing of their own (collectionIcon).
              <div className="absolute top-full left-1/2 z-50 mt-4 w-80 -translate-x-1/2">
                <span
                  aria-hidden="true"
                  className="absolute -top-1.5 left-1/2 size-4 -translate-x-1/2 rotate-45 rounded-tl-sm bg-bg"
                />
                <ul
                  id={listId}
                  aria-label="Collections"
                  className="dropdown relative flex flex-col rounded-lg bg-bg p-3 text-fg shadow-soft"
                >
                  {collections.map((link, i) => {
                    const Icon = collectionIcon(
                      link.href.slice('/collections/'.length),
                      'dropdown',
                    );
                    return (
                      <li key={link.href} className={i > 0 ? 'border-t border-border' : undefined}>
                        <Link
                          href={link.href}
                          aria-current={current(link.href)}
                          onClick={() => setOpen(false)}
                          className="dropdown-row group my-1 flex min-h-14 items-center gap-4 rounded-md px-3 text-body-lg hover:bg-accent/10 focus-visible:bg-accent/10 aria-[current=page]:bg-accent/10"
                        >
                          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent-text">
                            <Icon className="size-7" />
                          </span>
                          {link.label}
                          <ChevronIcon className="nudge ml-auto size-5 text-muted group-hover:text-accent-text group-aria-[current=page]:text-accent-text" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </li>
        <li>
          <Link
            href="/shop"
            aria-current={current('/shop')}
            data-active={pathname === '/shop'}
            className={item}
          >
            All Suits
          </Link>
        </li>
      </ul>
    </nav>
  );
}
