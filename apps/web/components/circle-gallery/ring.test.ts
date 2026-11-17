import { describe, expect, it } from 'vitest';

import { BACK_SCALE, frontIndex, ringPlacement, settle, stepFor } from './ring';

describe('ring maths', () => {
  it('puts every card on the circle, spaced evenly, with the first at the bottom (in front)', () => {
    const count = 8;
    for (let i = 0; i < count; i += 1) {
      const { x, y } = ringPlacement(i, count, 0);
      expect(Math.hypot(x, y)).toBeCloseTo(1, 6);
    }
    const first = ringPlacement(0, count, 0);
    expect(first.x).toBeCloseTo(0, 6);
    expect(first.y).toBeCloseTo(1, 6);
    // The one opposite sits at the top, furthest back.
    const back = ringPlacement(4, count, 0);
    expect(back.y).toBeCloseTo(-1, 6);
    expect(back.depth).toBeCloseTo(0, 6);
  });

  it('keeps depth 0–1 and the scale between the back size and full size', () => {
    for (let rotation = -720; rotation <= 720; rotation += 7) {
      for (let i = 0; i < 8; i += 1) {
        const { depth, scale, z } = ringPlacement(i, 8, rotation);
        expect(depth).toBeGreaterThanOrEqual(0);
        expect(depth).toBeLessThanOrEqual(1);
        expect(scale).toBeGreaterThanOrEqual(BACK_SCALE);
        expect(scale).toBeLessThanOrEqual(1);
        expect(Number.isInteger(z)).toBe(true);
      }
    }
    expect(ringPlacement(0, 8, 0).scale).toBe(1);
    expect(ringPlacement(0, 8, 0).z).toBeGreaterThan(ringPlacement(1, 8, 0).z);
  });

  it('knows which card is in front at any rotation, in either direction and past a full turn', () => {
    expect(frontIndex(8, 0)).toBe(0);
    expect(frontIndex(8, -45)).toBe(1);
    expect(frontIndex(8, 45)).toBe(7);
    expect(frontIndex(8, -360 - 90)).toBe(2);
    expect(frontIndex(8, -20)).toBe(0);
    expect(frontIndex(8, -25)).toBe(1);
  });

  it('settles on the nearest whole step', () => {
    expect(settle(-20, 8)).toBe(0);
    expect(settle(-25, 8)).toBe(-45);
    expect(settle(100, 8)).toBe(90);
    expect(settle(-400, 8)).toBe(-405);
  });

  it('gives the rotation that brings any card to the front, by the shortest way', () => {
    for (let i = 0; i < 8; i += 1) {
      for (const from of [0, -135, 270, -1000]) {
        const target = stepFor(i, 8, from);
        expect(frontIndex(8, target)).toBe(i);
        expect(Math.abs(target - from)).toBeLessThanOrEqual(180 + 1e-9);
      }
    }
  });
});
