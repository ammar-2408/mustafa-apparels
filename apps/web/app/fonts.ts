import { Montserrat } from 'next/font/google';

// The only brand font (docs/design.md §1.2): Light 300 or Bold 700 for headings, Regular 400 for the rest.
export const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  display: 'swap',
  variable: '--font-montserrat',
});
