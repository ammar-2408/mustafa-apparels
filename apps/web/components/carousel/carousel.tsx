'use client';

import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';

import { ChevronIcon } from '../site/icons';

type Props = {
  /** Names the carousel for screen readers, e.g. "Newest suits". */
  label: string;
  /** Rendered on the server, so the cached HTML holds every card. */
  items: ReactNode[];
  /** The width of each slide per breakpoint, e.g. "w-[76%] lg:w-1/3". */
  itemClassName: string;
};

type View = { atStart: boolean; atEnd: boolean; page: number; pages: number };

const DRAG_THRESHOLD = 5;

// A row of cards that scrolls sideways (the owner's mockups, 2026-11-15). Native scroll-snap does
// the work, so touch swiping and vertical page scrolling stay the browser's own. On top: Previous
// and Next, one dot per page, and mouse dragging on desktop. A drag never opens the card under it.
// No library (docs/design.md §4).
export function Carousel({ label, items, itemClassName }: Props) {
  const track = useRef<HTMLUListElement>(null);
  const [view, setView] = useState<View>({ atStart: true, atEnd: true, page: 0, pages: 1 });
  const drag = useRef({ active: false, moved: false, startX: 0, startScroll: 0 });

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    // Count screens with the gap between cards, so 3 phone-wide cards make 3 dots, not 4.
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const pages = max <= 1 ? 1 : Math.ceil((el.scrollWidth + gap) / (el.clientWidth + gap) - 0.01);
    const page = max <= 1 ? 0 : Math.round((el.scrollLeft / max) * (pages - 1));
    setView({ atStart: el.scrollLeft <= 1, atEnd: el.scrollLeft >= max - 1, page, pages });
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    measure();
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    resize?.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('scroll', onScroll);
      resize?.disconnect();
    };
  }, [measure]);

  const behavior = (): ScrollBehavior =>
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

  // One card (and its gap) per arrow press.
  const step = (direction: 1 | -1) => {
    const el = track.current;
    const [first, second] = el ? Array.from(el.children) : [];
    if (!el || !(first instanceof HTMLElement)) return;
    const stride =
      second instanceof HTMLElement ? second.offsetLeft - first.offsetLeft : first.offsetWidth;
    el.scrollBy({ left: direction * (stride || el.clientWidth), behavior: behavior() });
  };

  const goTo = (page: number) => {
    const el = track.current;
    if (!el || view.pages < 2) return;
    const max = el.scrollWidth - el.clientWidth;
    el.scrollTo({ left: (page / (view.pages - 1)) * max, behavior: behavior() });
  };

  // Mouse dragging (touch already swipes natively). Snap is off while dragging, back on after.
  const onPointerDown = (event: React.PointerEvent<HTMLUListElement>) => {
    const el = track.current;
    if (!el || event.pointerType !== 'mouse' || event.button !== 0) return;
    drag.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      startScroll: el.scrollLeft,
    };
    const onMove = (move: PointerEvent) => {
      const dx = move.clientX - drag.current.startX;
      if (!drag.current.moved && Math.abs(dx) < DRAG_THRESHOLD) return;
      if (!drag.current.moved) {
        drag.current.moved = true;
        el.style.scrollSnapType = 'none';
        el.dataset.dragging = 'true';
      }
      el.scrollLeft = drag.current.startScroll - dx;
    };
    const onUp = () => {
      drag.current.active = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (drag.current.moved) {
        el.style.scrollSnapType = '';
        // With snap back on, the browser settles on the nearest card itself.
        delete el.dataset.dragging;
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // The click that ends a drag is not a click on the card.
  const onClickCapture = (event: React.MouseEvent) => {
    if (!drag.current.moved) return;
    event.preventDefault();
    event.stopPropagation();
    drag.current.moved = false;
  };

  const scrollable = view.pages > 1;
  return (
    <div role="region" aria-roledescription="carousel" aria-label={label} className="relative">
      <ul
        ref={track}
        onPointerDown={onPointerDown}
        onClickCapture={onClickCapture}
        onDragStart={(event) => event.preventDefault()}
        className="carousel-track -my-4 flex snap-x snap-mandatory gap-6 overflow-x-auto py-4 [scrollbar-width:none] data-[dragging=true]:cursor-grabbing [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, i) => (
          <li
            key={i}
            aria-label={`${i + 1} of ${items.length}`}
            aria-roledescription="slide"
            className={`min-w-0 shrink-0 snap-start ${itemClassName}`}
          >
            {item}
          </li>
        ))}
      </ul>

      {scrollable && (
        <>
          <button
            type="button"
            aria-label="Previous"
            disabled={view.atStart}
            onClick={() => step(-1)}
            className="carousel-arrow absolute top-1/2 left-0 z-10 hidden size-12 -translate-x-1/2 -translate-y-1/2 min-[112rem]:-translate-x-[calc(100%+16px)] items-center justify-center rounded-full bg-action text-action-fg shadow-soft disabled:opacity-30 md:flex"
          >
            <ChevronIcon className="size-5 rotate-180" />
          </button>
          <button
            type="button"
            aria-label="Next"
            disabled={view.atEnd}
            onClick={() => step(1)}
            className="carousel-arrow absolute top-1/2 right-0 z-10 hidden size-12 translate-x-1/2 -translate-y-1/2 min-[112rem]:translate-x-[calc(100%+16px)] items-center justify-center rounded-full bg-action text-action-fg shadow-soft disabled:opacity-30 md:flex"
          >
            <ChevronIcon className="size-5" />
          </button>
        </>
      )}

      {/* Always takes its height, so the dots arriving after load move nothing. */}
      <div className="mt-6 flex min-h-6 justify-center gap-1">
        {scrollable &&
          Array.from({ length: view.pages }, (_, page) => (
            <button
              key={page}
              type="button"
              aria-label={`Page ${page + 1} of ${view.pages}`}
              aria-current={page === view.page ? 'true' : undefined}
              onClick={() => goTo(page)}
              className="carousel-dot group flex size-6 items-center justify-center rounded-full"
            >
              <span className="size-2.5 rounded-full bg-border-strong group-aria-[current=true]:bg-accent" />
            </button>
          ))}
      </div>
    </div>
  );
}
