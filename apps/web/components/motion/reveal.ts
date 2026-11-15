import type { CSSProperties } from 'react';

/** Starts a `.reveal` block 60ms after the one before it (motion.css). */
export const revealDelay = (i: number) => ({ '--reveal-i': i }) as CSSProperties;
