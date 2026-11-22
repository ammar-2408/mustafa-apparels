'use client';

import { shapedImageUrl } from '@mustafa/core/media-url';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';

import { SearchIcon } from '../site/icons';

type Suggestions = {
  collections: { name: string; slug: string }[];
  products: {
    name: string;
    slug: string;
    designCode: string | null;
    image: { url: string; alt: string } | null;
  }[];
};
type Option = {
  id: string;
  label: string;
  detail?: string;
  href: string;
  image?: { url: string; alt: string } | null;
};

export const DEBOUNCE_MS = 250;

function toOptions(found: Suggestions, prefix: string): Option[] {
  return [
    ...found.collections.map((c) => ({
      id: `${prefix}-c-${c.slug}`,
      label: c.name,
      detail: 'Collection',
      href: `/collections/${c.slug}`,
    })),
    ...found.products.map((p) => ({
      id: `${prefix}-p-${p.slug}`,
      label: p.name,
      detail: p.designCode ?? undefined,
      href: `/products/${p.slug}`,
      image: p.image,
    })),
  ];
}

// The navbar's search box (owner, 2026-11-22: no separate search page): a combobox. Typing waits
// 250 ms, then asks for up to 6 matches, collections first, then suits with a small photo
// (docs/api.md suggest). Arrow keys move through them, Enter opens the chosen one or the first,
// Esc closes the list. Without JavaScript the form goes to All Suits.
export function SearchBox({ focusOnOpen = false }: { focusOnOpen?: boolean }) {
  const router = useRouter();
  const listId = useId();
  const [value, setValue] = useState('');
  const [options, setOptions] = useState<Option[]>([]);
  // The query the shown results belong to; null while nothing has been asked.
  const [answered, setAnswered] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const latest = useRef(0);
  const field = useRef<HTMLInputElement>(null);

  // Opened on purpose from a Search button: put the cursor in the field, ready to type.
  useEffect(() => {
    if (focusOnOpen) field.current?.focus();
  }, [focusOnOpen]);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) return;
    const request = ++latest.current;
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`);
        if (request !== latest.current) return;
        // Refused (too many searches) or failed: no old suggestions under new text.
        if (!response.ok) {
          setOptions([]);
          setAnswered(null);
          setOpen(false);
          return;
        }
        const found = toOptions((await response.json()) as Suggestions, listId);
        setOptions(found);
        setAnswered(q);
        setActive(-1);
        setOpen(found.length > 0);
      } catch {
        if (request === latest.current) {
          setOptions([]);
          setAnswered(null);
          setOpen(false);
        }
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value, listId]);

  const go = (option: Option) => router.push(option.href);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && options.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % options.length);
    } else if (event.key === 'ArrowUp' && options.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActive((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (event.key === 'Escape') {
      // With the list open, Esc only closes the list; otherwise it closes the search box.
      if (open) {
        event.preventDefault();
        event.stopPropagation();
      }
      setOpen(false);
      setActive(-1);
    } else if (event.key === 'Enter' && open && active >= 0) {
      event.preventDefault();
      go(options[active]!);
    }
  };

  // Enter (or the search button) opens the chosen match, else the best one.
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const chosen = options[active] ?? options[0];
    if (chosen && value.trim().length >= 2) go(chosen);
  };

  const q = value.trim();
  const showList = open && options.length > 0 && q.length >= 2;
  const nothing = q.length >= 2 && answered === q && options.length === 0;

  return (
    <form action="/shop" method="get" role="search" onSubmit={onSubmit} className="relative">
      <label htmlFor={`${listId}-input`} className="sr-only">
        Search suits
      </label>
      <div className="flex items-center gap-3 rounded-full border border-border-strong bg-surface py-1.5 pr-1.5 pl-5">
        <SearchIcon className="size-5 shrink-0 text-muted" />
        <input
          id={`${listId}-input`}
          name="q"
          type="search"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (e.target.value.trim().length < 2) setOpen(false);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onFocus={() => options.length > 0 && setOpen(true)}
          ref={field}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? options[active]!.id : undefined}
          autoComplete="off"
          maxLength={60}
          placeholder="Name, fabric, colour or design code"
          className="min-h-11 w-full min-w-0 bg-transparent text-body text-fg focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Search"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-deep text-action-fg"
        >
          <SearchIcon className="size-5" />
        </button>
      </div>
      <ul
        id={listId}
        role="listbox"
        aria-label="Suggestions"
        hidden={!showList}
        className="mt-3 overflow-hidden rounded-lg border border-border bg-surface shadow-soft"
      >
        {options.map((option, i) => (
          <li
            key={option.id}
            id={option.id}
            role="option"
            aria-selected={i === active}
            onMouseDown={(e) => {
              e.preventDefault();
              go(option);
            }}
            className="flex min-h-14 cursor-pointer items-center gap-4 px-4 py-2 text-body text-fg aria-selected:bg-surface-soft hover:bg-surface-soft"
          >
            {option.image !== undefined && (
              <span className="relative aspect-3/4 w-10 shrink-0 overflow-hidden rounded-sm bg-surface-soft">
                {option.image && (
                  <Image
                    src={shapedImageUrl(option.image.url, 'card')}
                    alt=""
                    fill
                    sizes="2.5rem"
                    className="object-cover object-top"
                  />
                )}
              </span>
            )}
            <span className="min-w-0 flex-1">{option.label}</span>
            {option.detail && (
              <span className="shrink-0 text-small text-muted">{option.detail}</span>
            )}
          </li>
        ))}
      </ul>
      <div role="status" className="mt-4 text-body">
        {q.length < 2 && (
          <p className="text-muted">Type a name, a fabric, a colour or a design code.</p>
        )}
        {nothing && (
          <p>
            No suits match &ldquo;{q}&rdquo;. Try a fabric such as Dhanak or Khaddar, a colour, or{' '}
            <Link href="/shop" className="link">
              see all suits
            </Link>
            .
          </p>
        )}
      </div>
    </form>
  );
}
