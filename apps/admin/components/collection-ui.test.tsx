import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const router = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn() }));
const actions = vi.hoisted(() => ({
  setCategoryImage: vi.fn(),
  reorderCategories: vi.fn(),
  setCategoryActive: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
}));
const upload = vi.hoisted(() => ({ uploadFile: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('../app/(panel)/collections/actions', () => actions);
vi.mock('../lib/upload', async (original) => ({
  ...(await original<typeof import('../lib/upload')>()),
  ...upload,
}));

import { CollectionImage } from './collection-image';
import { CollectionList } from './collection-list';

beforeEach(() => {
  router.refresh.mockReset();
  for (const fn of Object.values(actions)) fn.mockReset().mockResolvedValue({ ok: true, data: {} });
  upload.uploadFile.mockReset().mockResolvedValue('categories/c1/new');
});

describe('CollectionImage', () => {
  const renderImage = (publicId: string | null = null) =>
    render(
      <CollectionImage collectionId="c1" name="Dhanak" cloudName="demo" publicId={publicId} />,
    );
  const choose = (file: File) =>
    fireEvent.change(screen.getByLabelText(/add photo|replace photo/i), {
      target: { files: [file] },
    });

  it('uploads for this collection and saves the image', async () => {
    renderImage();
    choose(new File(['x'], 'cover.jpg', { type: 'image/jpeg' }));
    await waitFor(() =>
      expect(actions.setCategoryImage).toHaveBeenCalledWith({
        id: 'c1',
        publicId: 'categories/c1/new',
      }),
    );
    expect(upload.uploadFile).toHaveBeenCalledWith(
      expect.any(File),
      { kind: 'image', target: 'category', targetId: 'c1' },
      expect.any(Function),
    );
    await waitFor(() => expect(router.refresh).toHaveBeenCalled());
  });

  it('refuses a GIF before uploading', async () => {
    renderImage();
    choose(new File(['x'], 'cover.gif', { type: 'image/gif' }));
    expect(await screen.findByText(/cover\.gif can't be used/)).toBeTruthy();
    expect(upload.uploadFile).not.toHaveBeenCalled();
  });

  it('shows the server’s reasons when the image is refused', async () => {
    actions.setCategoryImage.mockResolvedValue({
      ok: false,
      error: {
        code: 'VALIDATION',
        message: 'Check',
        fieldErrors: { file: ['The file is over 10 MB.'] },
      },
    });
    renderImage();
    choose(new File(['x'], 'cover.jpg', { type: 'image/jpeg' }));
    expect(await screen.findByText('The file is over 10 MB.')).toBeTruthy();
  });

  it('removes the image with null', async () => {
    renderImage('categories/c1/old');
    fireEvent.click(screen.getByRole('button', { name: 'Remove photo' }));
    await waitFor(() =>
      expect(actions.setCategoryImage).toHaveBeenCalledWith({ id: 'c1', publicId: null }),
    );
  });
});

describe('CollectionList', () => {
  const collections = [
    {
      id: 'a',
      name: 'Dhanak',
      slug: 'dhanak',
      isActive: true,
      productCount: 3,
      thumbUrl: 'https://res.cloudinary.com/demo/image/upload/w_120/categories/a/x',
    },
    { id: 'b', name: 'Khaddar', slug: 'khaddar', isActive: true, productCount: 1, thumbUrl: null },
  ];
  const names = () =>
    screen.getAllByRole('listitem').map((li) => li.querySelector('a')?.textContent);

  it('saves a new order and announces it', async () => {
    render(<CollectionList collections={collections} />);
    fireEvent.click(screen.getByRole('button', { name: 'Move Khaddar up' }));
    expect(names()).toEqual(['Khaddar', 'Dhanak']);
    await waitFor(() =>
      expect(actions.reorderCategories).toHaveBeenCalledWith({ ids: ['b', 'a'] }),
    );
    expect(await screen.findByText('New order saved.')).toBeTruthy();
  });

  it('puts the order back and shows the error when saving fails', async () => {
    actions.reorderCategories.mockResolvedValue({
      ok: false,
      error: { code: 'VALIDATION', message: 'The list must include every collection once' },
    });
    render(<CollectionList collections={collections} />);
    fireEvent.click(screen.getByRole('button', { name: 'Move Khaddar up' }));
    expect(await screen.findByText('The list must include every collection once')).toBeTruthy();
    expect(names()).toEqual(['Dhanak', 'Khaddar']);
  });

  it('hides a collection, marks it Hidden and announces it', async () => {
    render(<CollectionList collections={collections} />);
    fireEvent.click(screen.getByRole('button', { name: 'Hide Dhanak' }));
    await waitFor(() =>
      expect(actions.setCategoryActive).toHaveBeenCalledWith({ id: 'a', isActive: false }),
    );
    expect(screen.getByText('Hidden')).toBeTruthy();
    expect(await screen.findByText('Dhanak is now hidden on the shop.')).toBeTruthy();
  });

  it('shows each collection image as a small thumbnail, or a placeholder', () => {
    render(<CollectionList collections={collections} />);
    const [dhanak, khaddar] = screen.getAllByRole('listitem');
    expect(dhanak!.querySelector('img')?.getAttribute('src')).toBe(collections[0]!.thumbUrl);
    expect(dhanak!.querySelector('img')?.getAttribute('alt')).toBe('');
    expect(khaddar!.querySelector('img')).toBeNull();
    expect(khaddar!.textContent).toContain('No photo');
  });

  it('says so when there are no collections', () => {
    render(<CollectionList collections={[]} />);
    expect(screen.getByText(/No collections yet/)).toBeTruthy();
  });
});
