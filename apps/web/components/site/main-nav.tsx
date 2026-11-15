'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';

import type { NavLink } from '../../lib/nav';
import { ChevronIcon } from './icons';

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
              <ul
                id={listId}
                aria-label="Collections"
                className="dropdown absolute top-full left-1/2 z-50 mt-3 flex min-w-52 -translate-x-1/2 flex-col rounded-md bg-bg p-2 text-fg shadow-soft"
              >
                {collections.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={current(link.href)}
                      onClick={() => setOpen(false)}
                      className="flex min-h-11 items-center rounded-sm px-3 text-body hover:bg-surface-soft aria-[current=page]:font-bold"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
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
