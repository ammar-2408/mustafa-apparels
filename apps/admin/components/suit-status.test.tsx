import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const router = vi.hoisted(() => ({ push: vi.fn() }));
const actions = vi.hoisted(() => ({
  setProductStatus: vi.fn(),
  archiveProduct: vi.fn(),
  restoreProduct: vi.fn(),
  duplicateProduct: vi.fn(),
  clearProductCheck: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('../app/(panel)/suits/actions', () => actions);

import { OpenChecks } from './open-checks';
import { SuitStatus } from './suit-status';

const buttons = () => screen.getAllByRole('button').map((b) => b.textContent);

beforeEach(() => {
  router.push.mockReset();
  for (const fn of Object.values(actions))
    fn.mockReset().mockResolvedValue({ ok: true, data: { id: 'copy1' } });
});

describe('SuitStatus', () => {
  it('offers the right next steps for each status', () => {
    const { rerender } = render(<SuitStatus id="p1" status="draft" publishedOn={null} />);
    expect(buttons()).toEqual(['Publish', 'Archive', 'Duplicate']);
    rerender(<SuitStatus id="p1" status="published" publishedOn="5 Nov 2026" />);
    expect(buttons()).toEqual(['Unpublish', 'Archive', 'Duplicate']);
    expect(screen.getByText(/First published 5 Nov 2026/)).toBeTruthy();
    rerender(<SuitStatus id="p1" status="archived" publishedOn={null} />);
    expect(buttons()).toEqual(['Restore as draft', 'Duplicate']);
  });

  it('lists every publish problem, each linked to where it is fixed', async () => {
    actions.setProductStatus.mockResolvedValue({
      ok: false,
      error: {
        code: 'VALIDATION',
        message: 'Check',
        fieldErrors: {
          price: ['Add a price before publishing'],
          media: ['Choose a main photo'],
          checks: ['Clear the open check first'],
        },
      },
    });
    render(<SuitStatus id="p1" status="draft" publishedOn={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    await screen.findByText('Not published yet. Fix these first:');
    const alert = screen.getByText('Not published yet. Fix these first:').parentElement!;
    expect(within(alert).getByRole('link', { name: 'Price (Rs)' }).getAttribute('href')).toBe(
      '#field-price',
    );
    expect(within(alert).getByRole('link', { name: 'Photos' }).getAttribute('href')).toBe(
      '#media-heading',
    );
    expect(within(alert).getByRole('link', { name: 'Open checks' }).getAttribute('href')).toBe(
      '#checks-heading',
    );
    expect(alert.textContent).toContain('Add a price before publishing');
  });

  it('opens the copy after duplicating', async () => {
    render(<SuitStatus id="p1" status="draft" publishedOn={null} />);
    fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/suits/copy1'));
  });
});

describe('OpenChecks', () => {
  it('shows nothing when there are no checks', () => {
    const { container } = render(<OpenChecks id="p1" checks={[]} />);
    expect(container.textContent).toBe('');
  });

  it('marks one check cleared by its text', async () => {
    render(<OpenChecks id="p1" checks={['Confirm the trouser fabric', 'Corner flowers']} />);
    expect(screen.getByRole('heading', { name: 'Open checks (2)' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Mark cleared: Corner flowers' }));
    await waitFor(() =>
      expect(actions.clearProductCheck).toHaveBeenCalledWith({ id: 'p1', check: 'Corner flowers' }),
    );
  });
});
