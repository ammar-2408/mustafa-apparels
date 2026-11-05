import AxeBuilder from '@axe-core/playwright';
import { category } from '@mustafa/db/schema';
import { asc } from 'drizzle-orm';

import { ADMIN_URL, loginAsAdmin } from '../support/admin';
import { createDraftSuit, deleteSuits } from '../support/suits';
import { expect, test } from '../support/users';

// Signed-in admin page templates, checked like the public ones in pages.spec.ts: zero serious or
// critical WCAG 2.2 AA violations. One login covers them all. Add each new admin page here; pages
// that need a record get its id at run time.
const ADMIN_PAGES = (ids: { collectionId: string; suitId: string }) => [
  { name: 'admin dashboard', path: '/' },
  { name: 'admin collections', path: '/collections' },
  { name: 'admin new collection', path: '/collections/new' },
  { name: 'admin collection edit', path: `/collections/${ids.collectionId}` },
  { name: 'admin suits', path: '/suits' },
  { name: 'admin new suit', path: '/suits/new' },
  { name: 'admin inquiries', path: '/inquiries' },
  { name: 'admin customers', path: '/customers' },
  { name: 'admin suit edit', path: `/suits/${ids.suitId}` },
];

test('signed-in admin pages have no serious or critical accessibility violations', async ({
  page,
  users,
  db,
}) => {
  const [collection] = await db
    .select({ id: category.id })
    .from(category)
    .orderBy(asc(category.sortOrder))
    .limit(1);
  const suit = await createDraftSuit(db);
  try {
    await loginAsAdmin(page, users);
    for (const { name, path } of ADMIN_PAGES({ collectionId: collection!.id, suitId: suit.id })) {
      await page.goto(`${ADMIN_URL}${path}`);
      const { violations } = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      const serious = violations
        .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
        .map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.length})`);
      expect(serious, name).toEqual([]);
    }
  } finally {
    await deleteSuits(db, [suit.id]);
  }
});
