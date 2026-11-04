import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
const actions = vi.hoisted(() => ({ createCategory: vi.fn(), updateCategory: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('../app/(panel)/collections/actions', () => actions);

import { CollectionForm } from './collection-form';

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const submit = (name: RegExp) => fireEvent.click(screen.getByRole('button', { name }));
const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;

beforeEach(() => {
  router.push.mockReset();
  actions.createCategory.mockReset().mockResolvedValue({ ok: true, data: { id: 'c1' } });
  actions.updateCategory.mockReset().mockResolvedValue({ ok: true, data: { id: 'c1' } });
});

describe('CollectionForm', () => {
  it('fills the web address from the name until it is edited', () => {
    render(<CollectionForm />);
    type('Name', 'Winter Khaddar');
    expect(field('Web address').value).toBe('winter-khaddar');
    type('Web address', 'khaddar');
    type('Name', 'Winter Khaddar 2');
    expect(field('Web address').value).toBe('khaddar');
  });

  it('creates the collection and goes back to the list', async () => {
    render(<CollectionForm />);
    type('Name', 'Lajwanti');
    submit(/create collection/i);
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/collections'));
    expect(actions.createCategory).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Lajwanti', slug: 'lajwanti' }),
    );
  });

  it('shows field errors before sending anything', async () => {
    render(<CollectionForm />);
    type('Name', 'Maria B Lawn');
    submit(/create collection/i);
    // The name and its web address both carry the brand, so both say so.
    expect(await screen.findAllByText(/remove the brand name/i)).toHaveLength(2);
    expect(actions.createCategory).not.toHaveBeenCalled();
  });

  it('shows the server’s answer on the field it belongs to', async () => {
    actions.createCategory.mockResolvedValue({
      ok: false,
      error: {
        code: 'CONFLICT',
        message: 'That slug is already used',
        fieldErrors: { slug: ['Another collection already uses this slug'] },
      },
    });
    render(<CollectionForm />);
    type('Name', 'Dhanak');
    submit(/create collection/i);
    expect(await screen.findByText('Another collection already uses this slug')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe('That slug is already used');
    expect(router.push).not.toHaveBeenCalled();
  });

  it('edits an existing collection by id, keeping its address unless changed', async () => {
    render(
      <CollectionForm
        collection={{
          id: 'c9',
          name: 'Dhanak',
          slug: 'dhanak',
          description: null,
          seoTitle: null,
          seoDescription: null,
        }}
      />,
    );
    type('Name', 'Dhanak Winter');
    expect(field('Web address').value).toBe('dhanak');
    submit(/save changes/i);
    await waitFor(() =>
      expect(actions.updateCategory).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'c9', name: 'Dhanak Winter', slug: 'dhanak' }),
      ),
    );
  });
});
