import './globals.css';

import { brandIcons, brandViewport } from '@mustafa/config/brand';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { montserrat } from './fonts';

// Every page has a title (WCAG 2.4.2); later pages name themselves with this template.
export const metadata: Metadata = {
  title: { default: 'Mustafa Apparels Admin', template: '%s | Mustafa Apparels Admin' },
  icons: brandIcons,
};
export const viewport: Viewport = brandViewport;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body>{children}</body>
    </html>
  );
}
