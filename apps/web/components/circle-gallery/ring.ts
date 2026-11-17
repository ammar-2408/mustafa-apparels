// The maths behind the home page's circle gallery (docs/design.md, New Arrivals). Cards sit evenly
// around a circle; a card's angle is the ring's rotation plus its own place. Angle 0 is the bottom
// of the circle, the front: that card is drawn on top at full size, and cards shrink towards the
// back. Positions are on a unit circle; the component multiplies them by its radius.

/** The size of the card at the very back, as a share of full size. */
export const BACK_SCALE = 0.85;

const mod = (value: number, by: number) => ((value % by) + by) % by;

/** Degrees between two neighbouring cards. */
export const stepSize = (count: number) => 360 / count;

export function ringPlacement(index: number, count: number, rotationDeg: number) {
  const angle = ((rotationDeg + index * stepSize(count)) * Math.PI) / 180;
  const depth = (1 + Math.cos(angle)) / 2;
  return {
    x: Math.sin(angle),
    y: Math.cos(angle),
    depth,
    scale: BACK_SCALE + (1 - BACK_SCALE) * depth,
    z: Math.round(depth * 100),
  };
}

/** The card nearest the front at this rotation. */
export function frontIndex(count: number, rotationDeg: number) {
  return mod(Math.round(-rotationDeg / stepSize(count)), count);
}

/** The nearest rotation that puts a card exactly in front. */
export function settle(rotationDeg: number, count: number) {
  const step = stepSize(count);
  return Math.round(rotationDeg / step) * step || 0;
}

/** The rotation, nearest to `from`, that brings card `index` to the front. */
export function stepFor(index: number, count: number, from = 0) {
  const target = -index * stepSize(count);
  let diff = mod(target - from, 360);
  if (diff > 180) diff -= 360;
  return from + diff;
}
