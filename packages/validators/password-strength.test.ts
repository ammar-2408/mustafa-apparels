import { describe, expect, it } from 'vitest';

import { passwordStrength, STRENGTH_LABELS } from './password-strength';

describe('passwordStrength', () => {
  it.each([
    ['', 0],
    ['abc', 0],
    ['nine char', 0],
  ])('%j is too short (score %i)', (password, score) => {
    expect(passwordStrength(password).score).toBe(score);
  });

  it('scores longer passwords higher', () => {
    const scores = ['tencharsxy', 'twelve chars', 'sixteen-chars-xy', 'twenty characters!!x'].map(
      (p) => passwordStrength(p).score,
    );
    expect(scores).toEqual([...scores].sort((a, b) => a - b));
    expect(scores[0]).toBeGreaterThanOrEqual(1);
    expect(scores.at(-1)).toBe(4);
  });

  it('marks obvious patterns as weak, however long', () => {
    for (const password of [
      'aaaaaaaaaaaaaaaa',
      '12345678901234',
      'qwertyuiopasdf',
      'password1234',
    ]) {
      expect(passwordStrength(password).score).toBeLessThanOrEqual(1);
    }
  });

  it('rates a few unrelated words as strong', () => {
    expect(passwordStrength('maroon kettle river lamp').score).toBe(4);
  });

  it('caps the score at 4 for anything up to the maximum length', () => {
    expect(passwordStrength('Xy7!'.repeat(32)).score).toBeLessThanOrEqual(4);
  });

  it('labels each score', () => {
    expect(STRENGTH_LABELS).toEqual(['Too short', 'Weak', 'Fair', 'Good', 'Strong']);
    expect(passwordStrength('maroon kettle river lamp').label).toBe('Strong');
  });
});
