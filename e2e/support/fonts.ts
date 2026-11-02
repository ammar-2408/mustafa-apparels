import type { Page } from '@playwright/test';

// Weights of the Montserrat faces the page declares, leaving out next/font's metric fallback.
export const montserratWeights = (page: Page) =>
  page.evaluate(async () => {
    await document.fonts.ready;
    const weights = [...document.fonts]
      .filter((face) => /Montserrat/.test(face.family) && !/Fallback/i.test(face.family))
      .map((face) => face.weight);
    return [...new Set(weights)].sort();
  });
