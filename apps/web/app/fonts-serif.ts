import { DM_Serif_Display } from 'next/font/google';

// The serif for collection page titles (owner, 2026-11-17; docs/design.md §1.2). Imported only by
// the collection header, so other pages never download it. One weight, Latin only.
export const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-dm-serif',
});
