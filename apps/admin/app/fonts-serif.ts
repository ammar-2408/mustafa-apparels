import { DM_Serif_Display } from 'next/font/google';

// The storefront's serif for admin page titles (owner, 2026-11-22: the storefront's look in the
// admin). One weight, Latin only; next/font serves it from the admin itself, so CSP needs nothing.
export const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-dm-serif',
});
