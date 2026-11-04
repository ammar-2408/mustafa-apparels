import { ADMIN_URL, loginAsAdmin, openAdminMenu } from '../support/admin';
import { expect, test } from '../support/users';

test.use({ baseURL: ADMIN_URL });

test('a signed-in admin sees the dashboard counts and the admin sections', async ({
  page,
  users,
}) => {
  await loginAsAdmin(page, users);
  await expect(page).toHaveTitle('Dashboard | Mustafa Apparels Admin');

  // Each count is a number linked to its list.
  for (const label of ['Published', 'Drafts', 'Needs price', 'New inquiries', 'Customers']) {
    await expect(page.getByTestId(`count-${label}`)).toHaveText(/^\d+$/);
  }
  await expect(page.getByRole('link', { name: /needs price/i })).toHaveAttribute(
    'href',
    '/suits?needsPrice=1',
  );

  // The sidebar on wide screens; behind the Menu button on phones.
  await openAdminMenu(page);
  const nav = page.getByRole('navigation', { name: 'Admin' });
  await expect(nav.getByRole('link')).toHaveText([
    'Dashboard',
    'Suits',
    'Collections',
    'Inquiries',
    'Customers',
    'Settings',
    'Audit log',
  ]);
  await expect(nav.getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();

  // No sideways scroll at any width.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('the dashboard sends a signed-out visitor to log in', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
});
