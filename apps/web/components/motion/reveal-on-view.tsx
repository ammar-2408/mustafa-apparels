'use client';

import { useEffect } from 'react';

// Marks each `.reveal` heading `is-shown` the first time it scrolls into view; motion.css does the
// rest (8px rise and fade, 220ms). One observer for the whole page, and each heading is let go once
// shown. Renders nothing. Without IntersectionObserver every heading is shown at once.
export function RevealOnView() {
  useEffect(() => {
    const items = Array.from(document.querySelectorAll<HTMLElement>('.reveal:not(.is-shown)'));
    if (typeof IntersectionObserver === 'undefined') {
      for (const item of items) item.classList.add('is-shown');
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add('is-shown');
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    for (const item of items) observer.observe(item);
    return () => observer.disconnect();
  }, []);
  return null;
}
