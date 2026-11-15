import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { Carousel } from './carousel';

// jsdom has no layout: give the track a size and a scroll position by hand.
function setLayout(track: HTMLElement, { scrollWidth, clientWidth }: Record<string, number>) {
  Object.defineProperty(track, 'scrollWidth', { configurable: true, value: scrollWidth });
  Object.defineProperty(track, 'clientWidth', { configurable: true, value: clientWidth });
}

const items = ['One', 'Two', 'Three', 'Four', 'Five'].map((name) => (
  <a key={name} href={`/products/${name.toLowerCase()}`}>
    {name}
  </a>
));

const original = {
  scrollWidth: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollWidth'),
  clientWidth: Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientWidth'),
};
afterEach(() => {
  for (const [key, value] of Object.entries(original)) {
    if (value) Object.defineProperty(HTMLElement.prototype, key, value);
  }
});

describe('Carousel', () => {
  it('is a labelled carousel region with every item as a numbered slide', () => {
    render(<Carousel label="Newest suits" items={items} itemClassName="w-1/2" />);
    const region = screen.getByRole('region', { name: 'Newest suits' });
    expect(region.getAttribute('aria-roledescription')).toBe('carousel');
    const slides = within(region).getAllByRole('listitem');
    expect(slides).toHaveLength(5);
    expect(slides[0]!.getAttribute('aria-label')).toBe('1 of 5');
    expect(within(region).getAllByRole('link')).toHaveLength(5);
  });

  it('shows arrows and one dot per page when the row is wider than the screen', async () => {
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 400 });
    render(<Carousel label="Newest suits" items={items} itemClassName="w-1/2" />);
    const previous = screen.getByRole('button', { name: 'Previous' }) as HTMLButtonElement;
    const next = screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement;
    expect(previous.disabled).toBe(true);
    expect(next.disabled).toBe(false);
    const dots = screen.getAllByRole('button', { name: /^Page \d of 3$/ });
    expect(dots).toHaveLength(3);
    expect(dots[0]!.getAttribute('aria-current')).toBe('true');

    // Scrolled to the end: Next is off, the last dot is current.
    const track = screen.getByRole('list');
    setLayout(track, { scrollWidth: 1000, clientWidth: 400 });
    // The carousel measures on the next animation frame.
    await act(async () => {
      track.scrollLeft = 600;
      fireEvent.scroll(track);
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect((screen.getByRole('button', { name: 'Next' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('button', { name: 'Page 3 of 3' }).getAttribute('aria-current')).toBe(
      'true',
    );
  });

  it('hides the arrows and dots when everything fits', () => {
    Object.defineProperty(HTMLElement.prototype, 'scrollWidth', { configurable: true, value: 400 });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 400 });
    render(<Carousel label="Newest suits" items={items.slice(0, 1)} itemClassName="w-1/2" />);
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();
    expect(screen.queryAllByRole('button', { name: /^Page/ })).toHaveLength(0);
  });
});
