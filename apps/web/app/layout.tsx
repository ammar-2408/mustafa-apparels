import './globals.css';

import { brandIcons, brandViewport } from '@mustafa/config/brand';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { montserrat } from './fonts';

export const metadata: Metadata = { icons: brandIcons };
export const viewport: Viewport = brandViewport;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body>{children}</body>
    </html>
  );
}
