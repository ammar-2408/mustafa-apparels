import type { ReactNode } from 'react';

// Public, cached pages (ADR-021). The `js` class lets motion set hidden start states only when
// scripts run (docs/design.md §5.1); it runs before the content paints. Tier A's CSP allows it;
// the per-request pages, which need a nonce, don't have it and don't need it.
// Cached pages are refreshed by tag after admin saves, and at most an hour later anyway.
export const revalidate = 3600;

const MARK_JS = "document.documentElement.classList.add('js')";

export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script>{MARK_JS}</script>
      <main id="main" tabIndex={-1} className="focus:outline-none">
        {children}
      </main>
    </>
  );
}
