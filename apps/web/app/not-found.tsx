import type { Metadata } from 'next';

import { NotFoundContent } from '../components/not-found-content';

// Next adds its own noindex robots tag to every 404, so none is set here.
export const metadata: Metadata = { title: 'Page not found | Mustafa Apparels' };

// An unknown URL: inside the root layout only, so this page brings its own <main>.
export default function NotFound() {
  return (
    <main id="main" tabIndex={-1} className="focus:outline-none">
      <NotFoundContent />
    </main>
  );
}
