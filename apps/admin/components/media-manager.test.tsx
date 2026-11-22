import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const router = vi.hoisted(() => ({ refresh: vi.fn() }));
const actions = vi.hoisted(() => ({
  addProductMedia: vi.fn(),
  reorderProductMedia: vi.fn(),
  setPrimaryProductImage: vi.fn(),
  updateMediaAlt: vi.fn(),
  deleteProductMedia: vi.fn(),
}));
const upload = vi.hoisted(() => ({ uploadFile: vi.fn(), videoDuration: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('../app/(panel)/suits/[id]/actions', () => actions);
vi.mock('../lib/upload', async (original) => ({
  ...(await original<typeof import('../lib/upload')>()),
  ...upload,
}));

import { MediaManager } from './media-manager';

const MB = 1024 * 1024;
const fileOf = (name: string, type: string, size = 1000) => {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

const choose = (...files: File[]) =>
  fireEvent.change(screen.getByLabelText(/add photos or videos/i), { target: { files } });

const saved = [
  {
    id: 'm1',
    kind: 'image' as const,
    publicId: 'products/p1/a',
    alt: 'Black suit, front view',
    isPrimary: true,
    posterPublicId: null,
    durationSeconds: null,
  },
  {
    id: 'm2',
    kind: 'image' as const,
    publicId: 'products/p1/b',
    alt: 'Black suit, back view',
    isPrimary: false,
    posterPublicId: null,
    durationSeconds: null,
  },
];

beforeEach(() => {
  router.refresh.mockReset();
  for (const fn of Object.values(actions)) fn.mockReset().mockResolvedValue({ ok: true, data: {} });
  upload.uploadFile.mockReset().mockResolvedValue('products/p1/new');
  upload.videoDuration.mockReset().mockResolvedValue(20);
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:preview');
  globalThis.URL.revokeObjectURL = vi.fn();
  // jsdom has no modal dialog; these record that it opens and closes (as in packages/ui).
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  });
});

const renderManager = (media = saved) =>
  render(<MediaManager productId="p1" cloudName="demo" media={media} />);

describe('MediaManager', () => {
  it('refuses a wrong type or an oversize photo before uploading', async () => {
    renderManager();
    choose(fileOf('logo.gif', 'image/gif'), fileOf('huge.jpg', 'image/jpeg', 11 * MB));
    expect(await screen.findByText(/logo\.gif can't be used/)).toBeTruthy();
    expect(screen.getByText(/huge\.jpg is 11\.0 MB/)).toBeTruthy();
    expect(upload.uploadFile).not.toHaveBeenCalled();
  });

  it('refuses a video over 60 seconds before uploading', async () => {
    upload.videoDuration.mockResolvedValue(75);
    renderManager();
    choose(fileOf('walk.mp4', 'video/mp4'));
    expect(await screen.findByText(/walk\.mp4 is 75 seconds long/)).toBeTruthy();
    expect(upload.uploadFile).not.toHaveBeenCalled();
  });

  it('uploads at once, then saves only with alt text, and refreshes', async () => {
    renderManager([]);
    choose(fileOf('front.jpg', 'image/jpeg'));
    const uploads = await screen.findByRole('list', { name: 'New uploads' });
    const button = await within(uploads).findByRole('button', { name: 'Save photo' });
    expect(upload.uploadFile).toHaveBeenCalledWith(
      expect.any(File),
      { kind: 'image', target: 'product', targetId: 'p1' },
      expect.any(Function),
    );

    fireEvent.click(button);
    expect(await within(uploads).findByRole('alert')).toBeTruthy();
    expect(actions.addProductMedia).not.toHaveBeenCalled();

    fireEvent.change(within(uploads).getByLabelText('Alt text'), {
      target: { value: 'Black suit, front view' },
    });
    fireEvent.click(button);
    await waitFor(() =>
      expect(actions.addProductMedia).toHaveBeenCalledWith({
        productId: 'p1',
        kind: 'image',
        publicId: 'products/p1/new',
        alt: 'Black suit, front view',
      }),
    );
    await waitFor(() => expect(screen.queryByRole('list', { name: 'New uploads' })).toBeNull());
  });

  // Quicker suit adding (owner, 2026-11-22): one click saves every upload that has its alt text.
  it('saves every ready upload at once with Save all, and leaves the one without alt text', async () => {
    actions.addProductMedia.mockResolvedValue({ ok: true, data: { id: 'x' } });
    upload.uploadFile
      .mockResolvedValueOnce('products/p1/one')
      .mockResolvedValueOnce('products/p1/two')
      .mockResolvedValueOnce('products/p1/three');
    renderManager([]);
    choose(
      fileOf('one.jpg', 'image/jpeg'),
      fileOf('two.jpg', 'image/jpeg'),
      fileOf('three.jpg', 'image/jpeg'),
    );
    const uploads = await screen.findByRole('list', { name: 'New uploads' });
    await waitFor(() =>
      expect(within(uploads).getAllByRole('button', { name: 'Save photo' })).toHaveLength(3),
    );
    expect(screen.queryByRole('button', { name: /Save all/ })).toBeNull();
    const alts = within(uploads).getAllByLabelText('Alt text');
    fireEvent.change(alts[0]!, { target: { value: 'Black suit, front view' } });
    expect(screen.queryByRole('button', { name: /Save all/ })).toBeNull();
    fireEvent.change(alts[1]!, { target: { value: 'Black suit, back view' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save all 2 photos' }));
    await waitFor(() => expect(actions.addProductMedia).toHaveBeenCalledTimes(2));
    expect(actions.addProductMedia).toHaveBeenNthCalledWith(1, {
      productId: 'p1',
      kind: 'image',
      publicId: 'products/p1/one',
      alt: 'Black suit, front view',
    });
    expect(actions.addProductMedia).toHaveBeenNthCalledWith(2, {
      productId: 'p1',
      kind: 'image',
      publicId: 'products/p1/two',
      alt: 'Black suit, back view',
    });
    await waitFor(() =>
      expect(within(uploads).getAllByRole('button', { name: 'Save photo' })).toHaveLength(1),
    );
  });

  it('shows the server’s reasons when Cloudinary’s figures fail the check', async () => {
    actions.addProductMedia.mockResolvedValue({
      ok: false,
      error: {
        code: 'VALIDATION',
        message: 'Check the highlighted fields',
        fieldErrors: { file: ['The file is over 10 MB.'] },
      },
    });
    renderManager([]);
    choose(fileOf('front.jpg', 'image/jpeg'));
    const uploads = await screen.findByRole('list', { name: 'New uploads' });
    fireEvent.change(within(uploads).getByLabelText('Alt text'), {
      target: { value: 'Front view' },
    });
    fireEvent.click(await within(uploads).findByRole('button', { name: 'Save photo' }));
    expect(await within(uploads).findByText('The file is over 10 MB.')).toBeTruthy();
    expect(within(uploads).getByRole('button', { name: 'Remove' })).toBeTruthy();
  });

  it('marks the main photo, makes another main, and asks before deleting', async () => {
    renderManager();
    expect(screen.getByText('Main')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Make main' }));
    await waitFor(() =>
      expect(actions.setPrimaryProductImage).toHaveBeenCalledWith({
        productId: 'p1',
        mediaId: 'm2',
      }),
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]!);
    expect(actions.deleteProductMedia).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('dialog', { name: 'Delete this photo?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    // Make main moved m2 to the front, so the first Delete is now m2's.
    await waitFor(() => expect(actions.deleteProductMedia).toHaveBeenCalledWith({ mediaId: 'm2' }));
  });

  it('says an imported stock file stays in Cloudinary when it is deleted from the suit', async () => {
    renderManager([
      {
        id: 'm9',
        kind: 'image' as const,
        publicId: 'products/imported/DHN-01/dhnk1-0a1b2c3d',
        alt: 'A black suit',
        isPrimary: true,
        posterPublicId: null,
        durationSeconds: null,
      },
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete this photo?' });
    expect(dialog.textContent).toMatch(/stock import.*stays in Cloudinary/);
    expect(dialog.textContent).not.toMatch(/from Cloudinary/);
  });

  it('reorders with the arrow buttons', async () => {
    renderManager();
    fireEvent.click(screen.getByRole('button', { name: 'Move Photo 2 up' }));
    await waitFor(() =>
      expect(actions.reorderProductMedia).toHaveBeenCalledWith({
        productId: 'p1',
        mediaIds: ['m2', 'm1'],
      }),
    );
  });

  it('says what a suit still needs when it has no photos', () => {
    renderManager([]);
    expect(screen.getByText(/needs at least one photo/)).toBeTruthy();
  });
});

describe('MediaManager refusals', () => {
  it('says why a delete was refused, e.g. the last photo of a published suit', async () => {
    actions.deleteProductMedia.mockResolvedValue({
      ok: false,
      error: {
        code: 'VALIDATION',
        message: 'Check the highlighted fields',
        fieldErrors: { mediaId: ['This is the only photo of a published suit.'] },
      },
    });
    render(<MediaManager productId="p1" cloudName="demo" media={saved.slice(0, 1)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete this photo?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(await screen.findByText('This is the only photo of a published suit.')).toBeTruthy();
  });
});
