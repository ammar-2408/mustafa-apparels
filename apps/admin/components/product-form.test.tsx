import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
const actions = vi.hoisted(() => ({ createProduct: vi.fn(), updateProduct: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('../app/(panel)/suits/actions', () => actions);

import { ProductForm } from './product-form';

const collections = [
  { value: 'c1', label: 'Dhanak' },
  { value: 'c2', label: 'Khaddar' },
];

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const submit = (name: RegExp) => fireEvent.click(screen.getByRole('button', { name }));

beforeEach(() => {
  router.push.mockReset();
  router.refresh.mockReset();
  actions.createProduct.mockReset().mockResolvedValue({ ok: true, data: { id: 'p9' } });
  actions.updateProduct.mockReset().mockResolvedValue({ ok: true, data: { id: 'p9', slug: 'x' } });
});

describe('ProductForm', () => {
  it('shows every section and no size field', () => {
    render(<ProductForm collections={collections} />);
    for (const section of [
      'Basics',
      'Price',
      'Filters',
      'Pieces',
      'Colour',
      'Description and care',
      'Search engines',
    ]) {
      expect(screen.getByRole('group', { name: section })).toBeTruthy();
    }
    expect(screen.queryByLabelText(/size/i)).toBeNull();
  });

  it('fills the web address from the name and design code until it is edited', () => {
    render(<ProductForm collections={collections} />);
    type('Name', 'Black Embroidered Dhanak 3-Piece Suit');
    type('Design code', 'DHN-01');
    expect(field('Web address').value).toBe('black-embroidered-dhanak-3-piece-suit-dhn-01');
    type('Web address', 'black-suit-dhn-01');
    type('Name', 'Black Suit');
    expect(field('Web address').value).toBe('black-suit-dhn-01');
  });

  it('saves a new suit as a draft and opens its edit page', async () => {
    render(<ProductForm collections={collections} />);
    type('Name', 'Black Embroidered Dhanak 3-Piece Suit');
    type('Design code', 'DHN-01');
    type('Collection', 'c1');
    type('Fabric', 'Dhanak');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Embroidered' }));
    type('Price (Rs)', '4,500');
    submit(/save as draft/i);
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/suits/p9'));
    const [input] = actions.createProduct.mock.calls[0]!;
    expect(input).toMatchObject({
      name: 'Black Embroidered Dhanak 3-Piece Suit',
      categoryId: 'c1',
      price: 4500,
      design: ['Embroidered'],
      pieceDetails: [{ piece: 'shirt' }, { piece: 'dupatta' }, { piece: 'trouser' }],
    });
    expect(input).not.toHaveProperty('status');
  });

  it('shows field errors without sending, e.g. no collection or a brand name', async () => {
    render(<ProductForm collections={collections} />);
    type('Name', 'Khaadi Lawn Suit');
    submit(/save as draft/i);
    expect((await screen.findAllByText(/remove the brand name/i)).length).toBeGreaterThan(0);
    expect(screen.getByRole('alert').textContent).toBe('Check the highlighted fields.');
    expect(actions.createProduct).not.toHaveBeenCalled();
  });

  it('edits an existing suit by id and says it saved', async () => {
    render(
      <ProductForm
        collections={collections}
        suit={{
          id: 'p9',
          name: 'Black Suit',
          slug: 'black-suit-dhn-01',
          designCode: 'DHN-01',
          categoryId: 'c1',
          fabric: 'Dhanak',
          pieces: 'three_piece',
          design: ['Embroidered'],
          dressCategories: [],
          accentColors: ['cream'],
          pieceDetails: [{ piece: 'shirt', fabric: 'Dhanak', length_m: 2.5 }],
          availability: 'in_stock',
          featured: false,
          price: 4500,
        }}
      />,
    );
    expect(field('Accent colours').value).toBe('cream');
    expect(field('Shirt length (m)').value).toBe('2.5');
    expect((screen.getByRole('checkbox', { name: 'Trouser' }) as HTMLInputElement).checked).toBe(
      false,
    );
    type('Price (Rs)', '5000');
    submit(/save changes/i);
    expect(await screen.findByText('Changes saved.')).toBeTruthy();
    expect(actions.updateProduct).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'p9', price: 5000 }),
    );
  });
});
