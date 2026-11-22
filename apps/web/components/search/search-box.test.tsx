import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

import { DEBOUNCE_MS, SearchBox } from './search-box';

const found = {
  collections: [{ name: 'Khaddar', slug: 'khaddar' }],
  products: [
    {
      name: 'Teal Embroidered Khaddar 3-Piece Suit',
      slug: 'teal-kdr-05',
      designCode: 'KDR-05',
      image: { url: 'https://res.cloudinary.com/ma/image/upload/kdr-05.jpg', alt: 'Teal suit' },
    },
  ],
};

beforeEach(() => {
  vi.useFakeTimers();
  push.mockClear();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(found), { status: 200 })),
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function type(text: string) {
  fireEvent.change(screen.getByRole('combobox'), { target: { value: text } });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
  });
}

describe('SearchBox', () => {
  it('waits 250 ms, then suggests collections and suits', async () => {
    render(<SearchBox />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'khadar' } });
    expect(fetch).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    });
    expect(fetch).toHaveBeenCalledWith('/api/search/suggest?q=khadar');
    expect(screen.getByRole('combobox').getAttribute('aria-expanded')).toBe('true');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'KhaddarCollection',
      'Teal Embroidered Khaddar 3-Piece SuitKDR-05',
    ]);
  });

  it('asks for nothing under 2 characters', async () => {
    render(<SearchBox />);
    await type('k');
    expect(fetch).not.toHaveBeenCalled();
    expect(screen.getByRole('combobox').getAttribute('aria-expanded')).toBe('false');
  });

  it('moves with the arrow keys, opens the chosen one with Enter, and closes on Esc', async () => {
    render(<SearchBox />);
    await type('khadar');
    const box = screen.getByRole('combobox');
    fireEvent.keyDown(box, { key: 'ArrowDown' });
    fireEvent.keyDown(box, { key: 'ArrowDown' });
    const second = screen.getAllByRole('option')[1]!;
    expect(box.getAttribute('aria-activedescendant')).toBe(second.id);
    expect(second.getAttribute('aria-selected')).toBe('true');
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(push).toHaveBeenCalledWith('/products/teal-kdr-05');

    fireEvent.keyDown(box, { key: 'ArrowUp' });
    fireEvent.keyDown(box, { key: 'Escape' });
    expect(box.getAttribute('aria-expanded')).toBe('false');
    expect(box.getAttribute('aria-activedescendant')).toBeNull();
  });

  it('shows each suit with its small photo', async () => {
    render(<SearchBox />);
    await type('khadar');
    const suit = screen.getAllByRole('option')[1]!;
    expect(suit.querySelector('img')?.getAttribute('src')).toContain('kdr-05');
  });

  // There is no search page (owner, 2026-11-22): Enter opens the best match.
  it('opens the first result on Enter when none is chosen', async () => {
    render(<SearchBox />);
    await type('khadar');
    fireEvent.submit(screen.getByRole('search'));
    expect(push).toHaveBeenCalledWith('/collections/khaddar');
  });

  it('says so when nothing matches, and points to all suits', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ collections: [], products: [] }), { status: 200 }),
    );
    render(<SearchBox />);
    await type('zzzz');
    expect(screen.getByRole('status').textContent).toContain('No suits match “zzzz”');
    expect(screen.getByRole('link', { name: /see all suits/i }).getAttribute('href')).toBe('/shop');
    fireEvent.submit(screen.getByRole('search'));
    expect(push).not.toHaveBeenCalled();
  });

  it('closes old suggestions when the next request is refused', async () => {
    render(<SearchBox />);
    await type('khadar');
    expect(screen.getAllByRole('option')).toHaveLength(2);
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 429 }));
    await type('khaddar suit');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByRole('combobox').getAttribute('aria-expanded')).toBe('false');
  });
});
