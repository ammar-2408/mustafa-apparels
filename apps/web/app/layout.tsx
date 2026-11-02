import './globals.css';

import type { ReactNode } from 'react';

import { montserrat } from './fonts';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={montserrat.variable}>
      <body>{children}</body>
    </html>
  );
}
