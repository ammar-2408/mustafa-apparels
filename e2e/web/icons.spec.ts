import { test } from '@playwright/test';

import { expectBrandHead } from '../support/brand-head';

test('home page links the favicons, theme colour and manifest', async ({ page }) => {
  await expectBrandHead(page, 'Mustafa Apparels');
});
