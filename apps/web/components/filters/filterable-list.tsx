'use client';

import { buttonClass } from '@mustafa/ui/button';
import { Dialog } from '@mustafa/ui/dialog';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

import {
  applyFilters,
  CLIENT_PAGE_SIZE,
  type Facets,
  type FilterState,
  type FilterSuit,
  isActive,
  parseFilters,
  quickChips,
  type Sort,
  SORT_OPTIONS,
  toggle,
  toQuery,
  toSlug,
  visibleGroups,
} from '../../lib/filters';
import { ProductGrid } from '../product/product-grid';
import {
  BloomIcon,
  collectionIcon,
  FlowerIcon,
  FunnelIcon,
  LayersIcon,
  ShirtIcon,
} from '../site/icons';

// One fetch of /api/suits per visit, shared by every list page (ADR-018). A failed load is
// forgotten, so the next try fetches again; it never becomes an empty shop.
let suitsRequest: Promise<FilterSuit[]> | null = null;
export function loadSuits() {
  suitsRequest ??= fetch('/api/suits')
    .then((r) => {
      if (!r.ok) throw new Error('suits ' + r.status);
      return r.json() as Promise<{ suits: FilterSuit[] }>;
    })
    .then((body) => body.suits)
    .catch((error: unknown) => {
      suitsRequest = null;
      throw error;
    });
  return suitsRequest;
}

type Props = {
  facets: Facets;
  /** On a collection page, only its suits. */
  collectionSlug?: string;
  /** The server-rendered grid and page links, shown while nothing is filtered. */
  children: ReactNode;
};

// Pills with a small drawing before the label, the chosen one deep green (the owner's collection
// template, 2026-11-17). Shared with /shop.
const chip =
  'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-border-strong bg-bg/70 px-4 caps-tight sm:px-5 aria-pressed:border-deep aria-pressed:bg-deep aria-pressed:text-action-fg';

// Each quick filter's drawing. A value the shop adds later still gets one of the floral drawings.
function chipIcon(key: string, value: string) {
  if (key === 'pieces') return ShirtIcon;
  if (value === 'embroidered') return BloomIcon;
  if (value.includes('geometric')) return LayersIcon;
  if (value.includes('floral')) return FlowerIcon;
  return collectionIcon(value, 'dropdown');
}

// The filter bar and, once something is chosen, the filtered grid with its own paging. With no
// filter in the URL the server's grid shows, so the page works without JavaScript and crawlers
// see every suit. useSearchParams sits inside the <Suspense> the page puts around this.
export function FilterableList({ facets, collectionSlug, children }: Props) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const state = useMemo(
    () => parseFilters(new URLSearchParams(params.toString()), facets),
    [params, facets],
  );
  const active = isActive(state);
  const [suits, setSuits] = useState<FilterSuit[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [panel, setPanel] = useState(false);

  useEffect(() => {
    if (!active || suits) return;
    let cancelled = false;
    loadSuits().then(
      (all) => {
        if (!cancelled) {
          setFailed(false);
          setSuits(all);
        }
      },
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [active, suits, attempt]);

  const groups = visibleGroups(facets);
  const chips = quickChips(facets);
  // Push, not replace: Back undoes the last filter.
  const go = (next: FilterState) => {
    const query = toQuery(next);
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };
  const chosenCount = Object.values(state.selected).reduce((n, v) => n + v.length, 0);

  const scoped = useMemo(
    () => (suits ?? []).filter((s) => !collectionSlug || s.category.slug === collectionSlug),
    [suits, collectionSlug],
  );
  const results = useMemo(() => applyFilters(scoped, state), [scoped, state]);
  const pageCount = Math.max(1, Math.ceil(results.length / CLIENT_PAGE_SIZE));
  const page = Math.min(state.page, pageCount);
  const shown = results.slice((page - 1) * CLIENT_PAGE_SIZE, page * CLIENT_PAGE_SIZE);

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {chips.length > 0 && (
          // Wrapping rows on every screen, so no chip runs off a phone (owner, 2026-11-17).
          <div role="group" aria-label="Quick filters" className="flex flex-wrap gap-2">
            {chips.map((c) => {
              const Icon = chipIcon(c.key, c.value);
              return (
                <button
                  key={`${c.key}-${c.value}`}
                  type="button"
                  aria-pressed={state.selected[c.key]?.includes(c.value) ?? false}
                  onClick={() => go(toggle(state, c.key, c.value))}
                  className={chip}
                >
                  <Icon className="size-5" />
                  {c.label}
                </button>
              );
            })}
          </div>
        )}
        <div className="flex items-center gap-3">
          {groups.length > 0 && (
            <button
              type="button"
              onClick={() => setPanel(true)}
              className="lift inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full border border-action px-4 caps-tight text-fg hover:bg-action hover:text-action-fg sm:gap-3 sm:px-6"
            >
              <FunnelIcon className="size-5" />
              Filters{chosenCount > 0 ? ` (${chosenCount})` : ''}
            </button>
          )}
          <span aria-hidden="true" className="hidden h-8 w-px bg-border-strong sm:block" />
          <label className="flex min-h-12 min-w-0 flex-1 items-center gap-3 md:flex-none">
            <span className="caps-tight text-muted">Sort</span>
            <select
              value={state.sort}
              onChange={(e) => go({ ...state, sort: e.target.value as Sort, page: 1 })}
              className="min-h-12 w-full min-w-0 rounded-md border border-border-strong bg-surface px-4 text-body text-fg md:w-auto"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {!active ? (
        children
      ) : failed ? (
        // The filters couldn't load: say so, and keep showing every suit rather than none.
        <div className="flex flex-col gap-8">
          <div role="alert" className="flex flex-wrap items-center gap-4 text-body">
            <p>The filters couldn&rsquo;t load just now. Here are all the suits instead.</p>
            <button
              type="button"
              onClick={() => {
                setFailed(false);
                setAttempt((n) => n + 1);
              }}
              className="link py-2"
            >
              Try again
            </button>
          </div>
          {children}
        </div>
      ) : suits === null ? (
        <p role="status" className="text-body text-muted">
          Loading suits…
        </p>
      ) : (
        <div>
          <div className="mb-8 flex flex-wrap items-center gap-4">
            <p role="status" className="caps-tight text-muted">
              {results.length} {results.length === 1 ? 'suit' : 'suits'} match
            </p>
            <button
              type="button"
              onClick={() => go({ selected: {}, sort: 'newest', page: 1 })}
              className="link py-2"
            >
              Clear all
            </button>
          </div>
          {shown.length > 0 ? (
            <ProductGrid suits={shown} eager={0} />
          ) : (
            <p className="text-body-lg">No suits match these filters. Try removing one.</p>
          )}
          {pageCount > 1 && (
            <nav aria-label="Pages of results" className="mt-16 flex justify-center gap-2">
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-current={n === page ? 'page' : undefined}
                  onClick={() => {
                    go({ ...state, page: n });
                    window.scrollTo({ top: 0 });
                  }}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center aria-[current=page]:border-b aria-[current=page]:border-fg"
                >
                  <span className="sr-only">Page </span>
                  {n}
                </button>
              ))}
            </nav>
          )}
        </div>
      )}

      {panel && (
        <Dialog
          open={panel}
          onClose={() => setPanel(false)}
          title="Filters"
          className="mb-0 max-h-[85dvh] w-full! max-w-none! rounded-none md:mr-0 md:mb-auto md:h-dvh md:max-h-none md:max-w-md!"
        >
          <div className="flex flex-col gap-8">
            {groups.map((g) => (
              <fieldset key={g.key}>
                <legend className="caps-tight mb-3">{g.label}</legend>
                <div className="flex flex-wrap gap-2">
                  {g.choices.map((c) => {
                    const value = toSlug(c.value);
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={state.selected[g.key]?.includes(value) ?? false}
                        onClick={() => go(toggle(state, g.key, value))}
                        className={chip}
                      >
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPanel(false)}
                className={`${buttonClass('primary')} flex-1`}
              >
                Show suits
              </button>
              <button
                type="button"
                onClick={() => go({ selected: {}, sort: state.sort, page: 1 })}
                className={buttonClass('secondary')}
              >
                Clear
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
