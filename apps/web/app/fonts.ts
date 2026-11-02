import { Montserrat } from 'next/font/google';

// The only brand font (docs/design.md §1.2): Light 300 for headings, Regular 400 for everything else.
export const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400'],
  display: 'swap',
  variable: '--font-montserrat',
});
