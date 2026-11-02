import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// docs/testing-qa.md: every page template, zero serious or critical violations of WCAG 2.2 AA.
// Add each new page template here.
const PAGES = [
  { name: 'storefront home', url: 'http://localhost:3000/' },
  { name: 'login', url: 'http://localhost:3000/login' },
  { name: 'register', url: 'http://localhost:3000/register' },
  { name: 'forgot password', url: 'http://localhost:3000/forgot-password' },
  { name: 'reset password', url: 'http://localhost:3000/reset-password?token=x' },
  { name: 'reset password, expired link', url: 'http://localhost:3000/reset-password' },
  { name: 'admin login', url: 'http://localhost:3001/login' },
  { name: 'admin 2FA code', url: 'http://localhost:3001/login/verify' },
];

for (const { name, url } of PAGES) {
  test(`${name} has no serious or critical accessibility violations`, async ({ page }) => {
    await page.goto(url);
    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const serious = violations
      .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
      .map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.length})`);
    expect(serious).toEqual([]);
  });
}
