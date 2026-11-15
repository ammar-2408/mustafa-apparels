'use client';

import { useRouter } from 'next/navigation';
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';

import { SearchIcon } from '../site/icons';

type Suggestions = {
  collections: { name: string; slug: string }[];
  products: { name: string; slug: string; designCode: string | null }[];
};
type Option = { id: string; label: string; detail?: string; href: string };

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
    })),
  ];
}

// The search box with suggestions (docs/api.md suggest): a combobox. Typing waits 250 ms, then asks
// for up to 6 suits and 2 collections. Arrow keys move through them, Enter opens the chosen one or
// searches, Esc closes the list. It is a plain GET form, so it works without JavaScript.
export function SearchBox({ defaultValue = '' }: { defaultValue?: string }) {
  const router = useRouter();
  const listId = useId();
  const [value, setValue] = useState(defaultValue);
  const [options, setOptions] = useState<Option[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const latest = useRef(0);
  const input = useRef<HTMLInputElement>(null);

  // Text typed before the page's scripts loaded is in the field but not in state: pick it up, so
  // suggestions still come on a slow phone (and in WebKit tests).
  useEffect(() => {
    const typed = input.current?.value ?? '';
    if (typed !== defaultValue) queueMicrotask(() => setValue(typed));
  }, [defaultValue]);

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
          setOpen(false);
          return;
        }
        const found = toOptions((await response.json()) as Suggestions, listId);
        setOptions(found);
        setActive(-1);
        setOpen(found.length > 0);
      } catch {
        // Suggestions are a nicety: the search itself still works. Don't leave old ones open.
        if (request === latest.current) {
          setOptions([]);
          setOpen(false);
        }
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value, listId]);

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
      // A search field clears itself on Esc; with the list open, Esc only closes the list.
      if (open) event.preventDefault();
      setOpen(false);
      setActive(-1);
    } else if (event.key === 'Enter' && open && active >= 0) {
      event.preventDefault();
      router.push(options[active]!.href);
    }
  };

  const showList = open && options.length > 0 && value.trim().length >= 2;

  return (
    <form action="/search" method="get" role="search" className="relative">
      <label htmlFor={`${listId}-input`} className="caps-tight mb-2 block">
        Search suits
      </label>
      <div className="flex gap-2">
        <input
          ref={input}
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
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? options[active]!.id : undefined}
          autoComplete="off"
          maxLength={60}
          placeholder="Name, fabric, colour or design code"
          className="min-h-12 w-full rounded-sm border border-border-strong bg-surface px-4 text-body text-fg"
        />
        <button
          type="submit"
          aria-label="Search"
          className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-sm bg-action text-action-fg"
        >
          <SearchIcon />
        </button>
      </div>
      <ul
        id={listId}
        role="listbox"
        aria-label="Suggestions"
        hidden={!showList}
        className="absolute inset-x-0 top-full z-20 mt-1 rounded-sm border border-border-strong bg-surface shadow-soft"
      >
        {options.map((option, i) => (
          <li
            key={option.id}
            id={option.id}
            role="option"
            aria-selected={i === active}
            onMouseDown={(e) => {
              e.preventDefault();
              router.push(option.href);
            }}
            className="flex min-h-11 cursor-pointer items-center justify-between gap-4 px-4 py-2 text-body text-fg aria-selected:bg-surface-soft"
          >
            <span>{option.label}</span>
            {option.detail && <span className="text-small text-muted">{option.detail}</span>}
          </li>
        ))}
      </ul>
    </form>
  );
}
