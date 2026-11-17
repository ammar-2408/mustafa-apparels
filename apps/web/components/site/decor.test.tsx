import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FlowerSprig, LotusOrnament, Swash } from './flourish';
import {
  collectionIcon,
  FLORAL_ICONS,
  FlowerIcon,
  LatticeIcon,
  LotusIcon,
  PetalsIcon,
  ShirtIcon,
  SproutIcon,
} from './icons';

describe('collectionIcon', () => {
  it('gives each collection its own icon in the menu and on its card', () => {
    expect(collectionIcon('dhanak', 'menu')).toBe(ShirtIcon);
    expect(collectionIcon('dhanak', 'card')).toBe(FlowerIcon);
    expect(collectionIcon('khaddar', 'menu')).toBe(LatticeIcon);
    expect(collectionIcon('lajwanti', 'menu')).toBe(FlowerIcon);
    expect(collectionIcon('lajwanti', 'card')).toBe(LotusIcon);
  });

  it('gives the dropdown a lotus, a sprout and a four-petal flower', () => {
    expect(collectionIcon('dhanak', 'dropdown')).toBe(LotusIcon);
    expect(collectionIcon('khaddar', 'dropdown')).toBe(SproutIcon);
    expect(collectionIcon('lajwanti', 'dropdown')).toBe(PetalsIcon);
  });

  it('gives a new collection from admin a floral icon of its own, the same every time', () => {
    for (const place of ['menu', 'card', 'dropdown'] as const) {
      const icon = collectionIcon('lawn', place);
      expect(FLORAL_ICONS).toContain(icon);
      expect(collectionIcon('lawn', place)).toBe(icon);
    }
    // Different new collections don't all get the same drawing.
    const picks = new Set(
      ['lawn', 'linen', 'chiffon', 'cotton', 'silk'].map((s) => collectionIcon(s, 'dropdown')),
    );
    expect(picks.size).toBeGreaterThan(1);
  });
});

describe('decoration', () => {
  it('is hidden from screen readers and adds no text', () => {
    for (const node of [<FlowerSprig key="s" />, <LotusOrnament key="l" />, <Swash key="w" />]) {
      const { container, unmount } = render(node);
      const root = container.firstElementChild!;
      expect(root.getAttribute('aria-hidden')).toBe('true');
      expect(container.textContent).toBe('');
      unmount();
    }
  });

  it('draws the sprig with brand tokens only', () => {
    const { container } = render(<FlowerSprig />);
    const classes = [...container.querySelectorAll('[class]')].map((el) =>
      el.getAttribute('class'),
    );
    expect(classes.join(' ')).not.toMatch(/#|rgb|\[/);
    expect(container.querySelectorAll('[fill^="#"], [stroke^="#"]')).toHaveLength(0);
  });
});
