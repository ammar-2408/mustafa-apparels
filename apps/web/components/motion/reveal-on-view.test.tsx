import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RevealOnView } from './reveal-on-view';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('RevealOnView', () => {
  it('shows each heading once, when it first comes into view', () => {
    let fire: (entries: Partial<IntersectionObserverEntry>[]) => void = () => {};
    const unobserve = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(callback: (entries: Partial<IntersectionObserverEntry>[]) => void) {
          fire = callback;
        }
        observe() {}
        unobserve = unobserve;
        disconnect() {}
      },
    );
    const { container } = render(
      <>
        <h2 className="reveal">One</h2>
        <h2 className="reveal">Two</h2>
        <RevealOnView />
      </>,
    );
    const [one, two] = Array.from(container.querySelectorAll('h2'));
    fire([
      { target: one!, isIntersecting: true },
      { target: two!, isIntersecting: false },
    ]);
    expect(one!.classList.contains('is-shown')).toBe(true);
    expect(two!.classList.contains('is-shown')).toBe(false);
    expect(unobserve).toHaveBeenCalledWith(one);
  });

  it('shows everything at once in a browser without IntersectionObserver', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const { container } = render(
      <>
        <h2 className="reveal">One</h2>
        <RevealOnView />
      </>,
    );
    expect(container.querySelector('h2')!.classList.contains('is-shown')).toBe(true);
  });
});
