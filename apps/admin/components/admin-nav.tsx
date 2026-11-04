'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode, useState } from 'react';

export const NAV_ITEMS = [
  { href: '/', label: 'Dashboard' },
  { href: '/suits', label: 'Suits' },
  { href: '/collections', label: 'Collections' },
  { href: '/inquiries', label: 'Inquiries' },
  { href: '/customers', label: 'Customers' },
  { href: '/settings', label: 'Settings' },
  { href: '/audit', label: 'Audit log' },
] as const;

// The dashboard is current only on "/"; every other item also covers the pages under it.
export const isCurrent = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

type AdminNavProps = {
  /** The logo for the top bar on phones, rendered on the server. */
  mobileLogo: ReactNode;
  /** The sidebar footer: who is signed in and the log-out button. */
  footer: ReactNode;
};

// The powder blue panel: a sidebar from md, a top bar with a Menu button below it.
export function AdminNav({ mobileLogo, footer }: AdminNavProps) {
  const pathname = usePathname();
  // The page the phone menu was opened on: moving to another page closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (toggle: (value: boolean) => boolean) =>
    setOpenOn(toggle(open) ? pathname : null);

  return (
    <>
      <div className="flex min-h-16 items-center justify-between px-gutter md:hidden">
        {mobileLogo}
        <button
          type="button"
          className="caps-tight min-h-11 px-3"
          aria-expanded={open}
          aria-controls="admin-menu"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? 'Close' : 'Menu'}
        </button>
      </div>
      <div
        id="admin-menu"
        className={`${open ? 'flex' : 'hidden'} flex-col gap-8 px-gutter pb-6 md:flex md:flex-1 md:pb-8`}
      >
        <nav aria-label="Admin">
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map(({ href, label }) => {
              const current = isCurrent(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={current ? 'page' : undefined}
                    className={`caps-tight flex min-h-11 items-center rounded-sm px-3 ${
                      current ? 'bg-surface' : 'hover:underline hover:decoration-accent'
                    }`}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="mt-auto">{footer}</div>
      </div>
    </>
  );
}
