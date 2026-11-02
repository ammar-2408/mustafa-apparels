import './globals.css';

import { brandIcons, brandViewport } from '@mustafa/config/brand';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL } from '../lib/seo';
import { montserrat } from './fonts';

// Defaults for every page. A page's own openGraph replaces this one whole, so buildMetadata()
// (step 1.8) repeats the default image. Canonicals are set per page only, never here.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
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
    <html lang="en" className={montserrat.variable}>
      <body>{children}</body>
    </html>
  );
}
