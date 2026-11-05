import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const actions = vi.hoisted(() => ({ setVideoPoster: vi.fn() }));
const upload = vi.hoisted(() => ({ uploadFile: vi.fn() }));
vi.mock('../app/(panel)/suits/[id]/actions', () => actions);
vi.mock('../lib/upload', async (original) => ({
  ...(await original<typeof import('../lib/upload')>()),
  ...upload,
}));

import { VideoControls } from './video-controls';

const renderControls = (posterPublicId: string | null = null) =>
  render(
    <VideoControls
      productId="p1"
      mediaId="v1"
      publicId="products/p1/v"
      posterPublicId={posterPublicId}
      cloudName="demo"
    />,
  );

const choosePoster = (file: File) =>
  fireEvent.change(screen.getByLabelText('Change poster'), { target: { files: [file] } });

beforeEach(() => {
  actions.setVideoPoster.mockReset().mockResolvedValue({ ok: true, data: {} });
  upload.uploadFile.mockReset().mockResolvedValue('products/p1/poster-new');
});

describe('VideoControls', () => {
  it('plays the silent version muted and inline, with the first frame as poster', () => {
    renderControls();
    expect(screen.getByText('Poster: the first frame of the video.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Play preview' }));
    const video = screen.getByLabelText('Video preview') as HTMLVideoElement;
    expect(video.muted).toBe(true);
    expect(video.hasAttribute('playsinline')).toBe(true);
    expect(video.getAttribute('src')).toContain('/video/upload/ac_none,');
    expect(video.getAttribute('poster')).toContain('so_0');
  });

  it('uploads a photo as the poster and saves it', async () => {
    renderControls();
    choosePoster(new File(['x'], 'poster.jpg', { type: 'image/jpeg' }));
    await waitFor(() =>
      expect(actions.setVideoPoster).toHaveBeenCalledWith({
        mediaId: 'v1',
        posterPublicId: 'products/p1/poster-new',
      }),
    );
    expect(upload.uploadFile).toHaveBeenCalledWith(expect.any(File), {
      kind: 'image',
      target: 'product',
      targetId: 'p1',
      purpose: 'poster',
    });
  });

  it('refuses a video as a poster before uploading', async () => {
    renderControls();
    choosePoster(new File(['x'], 'clip.mp4', { type: 'video/mp4' }));
    expect(await screen.findByText(/clip\.mp4 can't be used/)).toBeTruthy();
    expect(upload.uploadFile).not.toHaveBeenCalled();
  });

  it('goes back to the first frame', async () => {
    renderControls('products/p1/poster-old');
    expect(screen.getByText('Poster: your photo.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Use first frame' }));
    await waitFor(() =>
      expect(actions.setVideoPoster).toHaveBeenCalledWith({ mediaId: 'v1', posterPublicId: null }),
    );
  });

  it('shows why the server refused the poster', async () => {
    actions.setVideoPoster.mockResolvedValue({
      ok: false,
      error: {
        code: 'VALIDATION',
        message: 'Check',
        fieldErrors: { file: ['The file is over 10 MB.'] },
      },
    });
    renderControls();
    choosePoster(new File(['x'], 'poster.jpg', { type: 'image/jpeg' }));
    expect(await screen.findByText('The file is over 10 MB.')).toBeTruthy();
  });
});
