import AxeBuilder from '@axe-core/playwright';

import { loginAsAdmin } from '../support/admin';
import { expect, test } from '../support/users';

// Signed-in admin page templates, checked like the public ones in pages.spec.ts: zero serious or
// critical WCAG 2.2 AA violations. One login covers them all. Add each new admin page here.
const ADMIN_PAGES = [
  { name: 'admin dashboard', path: '/' },
  { name: 'admin collections', path: '/collections' },
  { name: 'admin new collection', path: '/collections/new' },
];

test('signed-in admin pages have no serious or critical accessibility violations', async ({
  page,
  users,
}) => {
  await loginAsAdmin(page, users);
  for (const { name, path } of ADMIN_PAGES) {
    await page.goto(`http://localhost:3001${path}`);
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const serious = violations
      .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
      .map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.length})`);
    expect(serious, name).toEqual([]);
  }
});
