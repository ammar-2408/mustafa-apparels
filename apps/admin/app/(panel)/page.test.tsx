import { render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

const requireAdminPage = vi.hoisted(() =>
  vi.fn(async () => ({ user: { email: 'owner@example.com' } })),
);
vi.mock('../../lib/auth', () => ({ requireAdminPage }));
vi.mock('@mustafa/db/client', () => ({ getDb: () => 'db' }));
vi.mock('@mustafa/core/dashboard', () => ({
  counts: async () => ({
    published: 12,
    drafts: 3,
    needsPrice: 2,
    archived: 1,
    newInquiries: 4,
    customers: 9,
    collections: 3,
    hiddenCollections: 1,
  }),
}));

import Dashboard from './page';

it('checks access, then shows each count linked to its list', async () => {
  render(await Dashboard());
  expect(requireAdminPage).toHaveBeenCalled();
  expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeTruthy();

  const tile = (name: RegExp) => screen.getByRole('link', { name });
  expect(tile(/published/i).getAttribute('href')).toBe('/suits?status=published');
  expect(within(tile(/needs price/i)).getByText('2')).toBeTruthy();
  expect(tile(/needs price/i).getAttribute('href')).toBe('/suits?needsPrice=1');
  expect(within(tile(/new inquiries/i)).getByText('4')).toBeTruthy();
  expect(within(tile(/collections/i)).getByText('1 hidden')).toBeTruthy();
});
