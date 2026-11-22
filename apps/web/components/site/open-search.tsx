'use client';

import type { ReactNode } from 'react';

// The navbar's search box opens on this window event, so anything on the page can open it (the
// menu panel's Search tile, the 404 page). There is no search page (owner, 2026-11-22).
export const OPEN_SEARCH = 'ma:open-search';

export function openSearch() {
  window.dispatchEvent(new Event(OPEN_SEARCH));
}

/** A button that opens the navbar's search box. */
export function OpenSearchButton({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <button type="button" aria-haspopup="dialog" onClick={openSearch} className={className}>
      {children}
    </button>
  );
}
