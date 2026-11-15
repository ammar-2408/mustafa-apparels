import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FlowerSprig, LotusOrnament, Swash } from './flourish';
import { collectionIcon, FlowerIcon, LatticeIcon, LayersIcon, LotusIcon, ShirtIcon } from './icons';

describe('collectionIcon', () => {
  it('gives each collection its own icon in the menu and on its card', () => {
    expect(collectionIcon('dhanak', 'menu')).toBe(ShirtIcon);
    expect(collectionIcon('dhanak', 'card')).toBe(FlowerIcon);
    expect(collectionIcon('khaddar', 'menu')).toBe(LatticeIcon);
    expect(collectionIcon('lajwanti', 'menu')).toBe(FlowerIcon);
    expect(collectionIcon('lajwanti', 'card')).toBe(LotusIcon);
  });

  it('gives a new collection from admin the folded-fabric icon', () => {
    expect(collectionIcon('lawn', 'menu')).toBe(LayersIcon);
    expect(collectionIcon('lawn', 'card')).toBe(LayersIcon);
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
