import { test } from '@playwright/test';

import { expectBrandHead } from '../support/brand-head';

test.use({ baseURL: 'http://localhost:3001' });

test('admin login page links the favicons, theme colour and manifest', async ({ page }) => {
  await expectBrandHead(page, 'Mustafa Apparels Admin', '/login');
});
