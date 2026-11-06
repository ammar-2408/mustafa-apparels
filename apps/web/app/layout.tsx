import './globals.css';

import { brandIcons, brandViewport } from '@mustafa/config/brand';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { SiteFooter } from '../components/site/site-footer';
import { SiteHeader } from '../components/site/site-header';
import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from '../lib/seo';
import { montserrat } from './fonts';

// Defaults for every page. A page's own openGraph replaces this one whole, so buildMetadata()
// repeats the default image. Canonicals are set per page only, never here.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Until a page sets its own through buildMetadata(), it still has a title (WCAG 2.4.2).
  title: SITE_NAME,
  icons: brandIcons,
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_PK',
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: { card: 'summary_large_image', images: [DEFAULT_OG_IMAGE] },
};
export const viewport: Viewport = brandViewport;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // The (shop) layout adds the `js` class before hydration, so React mustn't warn about it.
    <html lang="en" className={montserrat.variable} suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only z-50 bg-action px-4 py-3 text-action-fg focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          Skip to content
        </a>
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
