import type { ReactNode } from 'react';

// A page number the build didn't prerender renders whole before any byte is sent, so a bad or
// out-of-range number gets a real 404 rather than a streamed 200 (docs/design.md §8.6).
export const instant = false;

export default function LaterPageLayout({ children }: { children: ReactNode }) {
  return children;
}
