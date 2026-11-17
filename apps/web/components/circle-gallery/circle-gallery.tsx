'use client';

import { shapedImageUrl } from '@mustafa/core/media-url';
import { buttonClass } from '@mustafa/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react';

import { cardLine, formatPrice, piecesLabel } from '../../lib/format';
import type { SuitCard } from '../../lib/types';
import { ArrowIcon, ChevronIcon } from '../site/icons';
import { frontIndex, ringPlacement, settle, stepFor } from './ring';

type Props = {
  /** Names the ring for screen readers, e.g. "Newest suits". */
  label: string;
  suits: SuitCard[];
};

const DRAG_THRESHOLD = 5;
const INTRO_MS = 900;
// How quickly a thrown ring slows down (per second), and the speed (°/s) where it settles.
const FRICTION = 3;
const SETTLE_SPEED = 25;
// The hardest throw: two turns a second, so a flick never whirls the ring round and round.
const MAX_SPEED = 720;

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

// A card's place on the ring. The radius is the CSS variable --ring-r (set per breakpoint), so the
// server HTML already has every card in place, before any script runs.
function cardStyle(index: number, count: number, rotation: number, spread = 1): CSSProperties {
  const { x, y, scale, z } = ringPlacement(index, count, rotation);
  return {
    transform: `translate(-50%, -50%) translate(calc(var(--ring-r) * ${(x * spread).toFixed(4)}), calc(var(--ring-r) * ${(y * spread).toFixed(4)})) scale(${scale.toFixed(4)})`,
    zIndex: z,
  };
}

/**
 * New Arrivals as a ring of suits (the owner, 2026-11-17: the idea of a "circle gallery", built
 * here from scratch). Cards stand upright around a circle; the one at the bottom is in front.
 * Drag to spin (it carries on and settles on a suit), or use Previous and Next. A focused card
 * turns to the front. With reduced motion every turn happens at once. No library.
 */
export function CircleGallery({ label, suits }: Props) {
  if (suits.length === 0) return null;
  return <Ring label={label} suits={suits} />;
}

function Ring({ label, suits }: Props) {
  const count = suits.length;
  const stage = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLLIElement | null)[]>([]);
  const [front, setFront] = useState(0);
  const frontRef = useRef(0);
  const motion = useRef({
    rotation: 0,
    target: null as number | null,
    velocity: 0,
    spread: 1,
    introStart: null as number | null,
    frame: 0,
    lastTime: 0,
  });
  const drag = useRef({
    active: false,
    moved: false,
    startX: 0,
    startRotation: 0,
    degPerPx: 0.3,
    samples: [] as { t: number; r: number }[],
  });
  const pointerAt = useRef(0);

  // Writes every card's place straight to the page: no React render per frame.
  const paint = useCallback(() => {
    const m = motion.current;
    cards.current.forEach((card, i) => {
      if (!card) return;
      const style = cardStyle(i, count, m.rotation, m.spread);
      card.style.transform = String(style.transform);
      card.style.zIndex = String(style.zIndex);
    });
    const now = frontIndex(count, m.rotation);
    if (now !== frontRef.current) {
      frontRef.current = now;
      setFront(now);
    }
  }, [count]);

  // One animation frame. Held in a ref, so the loop can schedule itself again.
  const tick = useRef<(time: number) => void>(() => {});
  useEffect(() => {
    tick.current = (time: number) => {
      const m = motion.current;
      const dt = Math.min(48, time - (m.lastTime || time)) / 1000;
      m.lastTime = time;
      let moving = false;

      if (m.introStart !== null) {
        const progress = Math.min(1, (time - m.introStart) / INTRO_MS);
        m.spread = easeOut(progress);
        if (progress < 1) moving = true;
        else m.introStart = null;
      }
      if (!drag.current.active) {
        if (m.target !== null) {
          const gap = m.target - m.rotation;
          if (Math.abs(gap) < 0.05) {
            m.rotation = m.target;
            m.target = null;
          } else {
            m.rotation += gap * (1 - Math.exp(-dt * 10));
            moving = true;
          }
        } else if (m.velocity !== 0) {
          m.rotation += m.velocity * dt;
          m.velocity *= Math.exp(-dt * FRICTION);
          if (Math.abs(m.velocity) < SETTLE_SPEED) {
            m.velocity = 0;
            m.target = settle(m.rotation, count);
          }
          moving = true;
        }
      }
      paint();
      if (moving) {
        m.frame = requestAnimationFrame((next) => tick.current(next));
      } else {
        m.frame = 0;
        m.lastTime = 0;
      }
    };
  }, [count, paint]);

  // Starts the loop unless it is already running. The frame reads the ref when it runs.
  const run = useCallback(() => {
    if (!motion.current.frame) {
      motion.current.frame = requestAnimationFrame((time) => tick.current(time));
    }
  }, []);

  useEffect(() => () => cancelAnimationFrame(motion.current.frame), []);

  // The intro: gathered in the centre, the cards spread out to the ring the first time the ring
  // comes into view. Skipped with reduced motion, without IntersectionObserver, or when the ring is
  // already on screen as the page loads.
  useEffect(() => {
    const el = stage.current;
    if (!el || reducedMotion() || typeof IntersectionObserver === 'undefined') return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    motion.current.spread = 0;
    paint();
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        motion.current.introStart = performance.now();
        run();
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [paint, run]);

  const goTo = (index: number) => {
    const m = motion.current;
    m.velocity = 0;
    const target = stepFor(index, count, m.target ?? m.rotation);
    if (reducedMotion()) {
      m.rotation = target;
      m.target = null;
      paint();
      return;
    }
    m.target = target;
    run();
  };

  const turn = (by: 1 | -1) => {
    const m = motion.current;
    goTo((frontIndex(count, m.target ?? m.rotation) + by + count) % count);
  };

  // Dragging sideways spins the ring; an up-and-down swipe still scrolls the page (touch-action).
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    pointerAt.current = Date.now();
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const el = stage.current;
    if (!el) return;
    // About one card per card-width of drag: the ring's radius in pixels sets the gearing.
    const radius = el.clientWidth > 0 ? Math.min(el.clientWidth, el.clientHeight) / 3 : 150;
    const m = motion.current;
    m.velocity = 0;
    m.target = null;
    drag.current = {
      active: true,
      moved: false,
      startX: event.clientX,
      startRotation: m.rotation,
      degPerPx: 180 / (Math.PI * radius),
      samples: [{ t: performance.now(), r: m.rotation }],
    };
    const onMove = (move: PointerEvent) => {
      const d = drag.current;
      const dx = move.clientX - d.startX;
      if (!d.moved && Math.abs(dx) < DRAG_THRESHOLD) return;
      if (!d.moved) {
        d.moved = true;
        el.dataset.dragging = 'true';
      }
      const raw = d.startRotation + dx * d.degPerPx;
      m.rotation = reducedMotion() ? settle(raw, count) : raw;
      const now = performance.now();
      d.samples = [...d.samples.filter((s) => now - s.t < 100), { t: now, r: raw }];
      paint();
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      const d = drag.current;
      d.active = false;
      delete el.dataset.dragging;
      if (!d.moved) return;
      if (reducedMotion()) {
        m.rotation = settle(m.rotation, count);
        paint();
        return;
      }
      // Throw: keep the speed of the last 100ms, then slow down and settle on a suit.
      const first = d.samples[0]!;
      const last = d.samples[d.samples.length - 1]!;
      const span = (last.t - first.t) / 1000;
      const speed = span > 0 ? (last.r - first.r) / span : 0;
      m.velocity = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, speed));
      if (Math.abs(m.velocity) < SETTLE_SPEED) {
        m.velocity = 0;
        m.target = settle(m.rotation, count);
      }
      run();
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  // The click that ends a drag is not a click on a suit.
  const onClickCapture = (event: React.MouseEvent) => {
    if (!drag.current.moved) return;
    event.preventDefault();
    event.stopPropagation();
    drag.current.moved = false;
  };

  const shown = suits[front]!;
  const arrow =
    'carousel-arrow flex size-12 shrink-0 items-center justify-center rounded-full bg-action text-action-fg shadow-soft';

  return (
    <div
      role="group"
      aria-label={label}
      className="[--card-w:8.5rem] [--ring-r:6rem] md:[--card-w:11rem] md:[--ring-r:9rem] lg:[--card-w:13rem] lg:[--ring-r:11rem]"
    >
      <div
        ref={stage}
        onPointerDown={onPointerDown}
        onClickCapture={onClickCapture}
        onDragStart={(event) => event.preventDefault()}
        style={{ height: 'calc(var(--ring-r) * 2 + var(--card-w) * 4 / 3 + 1.5rem)' }}
        className="relative mx-auto w-full max-w-3xl cursor-grab touch-pan-y select-none data-[dragging=true]:cursor-grabbing"
      >
        <ul>
          {suits.map((suit, i) => (
            <li
              key={suit.id}
              ref={(el) => {
                cards.current[i] = el;
              }}
              data-front={i === front}
              style={cardStyle(i, count, 0)}
              className="circle-card absolute top-1/2 left-1/2 w-(--card-w)"
            >
              <Link
                href={`/products/${suit.slug}`}
                aria-label={suit.name}
                onFocus={() => {
                  // A mouse press focuses the card too: only keyboard focus turns the ring.
                  if (Date.now() - pointerAt.current > 400) goTo(i);
                }}
                className="circle-link relative block aspect-3/4 overflow-hidden rounded-lg border-4 border-bg bg-surface-soft shadow-soft"
              >
                {suit.image ? (
                  <Image
                    src={shapedImageUrl(suit.image.url, 'card')}
                    alt={suit.image.alt}
                    fill
                    draggable={false}
                    sizes="(min-width: 64rem) 13rem, (min-width: 48rem) 11rem, 8.5rem"
                    className="object-cover object-top"
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center p-2 text-center caps-tight">
                    Photo coming soon
                  </span>
                )}
                <span
                  aria-hidden="true"
                  className="absolute top-2 left-2 rounded-full bg-bg/90 px-2 py-0.5 text-small font-bold text-fg"
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 flex items-center justify-center gap-4 sm:gap-8">
        <button type="button" aria-label="Previous suit" onClick={() => turn(-1)} className={arrow}>
          <ChevronIcon className="size-5 rotate-180" />
        </button>
        <div
          data-testid="circle-front"
          className="flex min-w-0 max-w-sm flex-1 flex-col items-center gap-1 text-center"
        >
          <p className="caps-tight text-muted">{cardLine(shown)}</p>
          <h3 className="text-body-lg font-bold">{shown.name}</h3>
          <p className="text-small text-muted">
            {piecesLabel(shown.pieces)}
            {shown.price !== null && (
              <>
                {' · '}
                <span className="sr-only">Price </span>
                <span className="font-bold text-fg">{formatPrice(shown.price)}</span>
              </>
            )}
          </p>
          <Link
            href={`/products/${shown.slug}`}
            className={buttonClass('secondary', 'mt-3 min-h-11', 'bold')}
          >
            View Suit
            <ArrowIcon className="nudge size-5" />
          </Link>
        </div>
        <button type="button" aria-label="Next suit" onClick={() => turn(1)} className={arrow}>
          <ChevronIcon className="size-5" />
        </button>
      </div>
    </div>
  );
}
