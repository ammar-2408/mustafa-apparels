import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SuitMedia } from '../../lib/types';
import { ProductVideo } from './product-video';

const video: SuitMedia = {
  id: 'v1',
  kind: 'video',
  url: 'https://res.cloudinary.com/ma/video/upload/products/imported/DHN-02/dhnk2-VID.mp4',
  publicId: 'products/imported/DHN-02/dhnk2-VID',
  alt: 'The model turns to show the embroidered shirt and the printed dupatta',
  width: 720,
  height: 1280,
  durationSeconds: 14,
  posterPublicId: null,
};

let observed: ((visible: boolean) => void) | undefined;
let reducedMotion = false;

beforeEach(() => {
  reducedMotion = false;
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
        observed = (visible) => callback([{ isIntersecting: visible }]);
      }
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('reduce') && reducedMotion,
  }));
  window.matchMedia = globalThis.matchMedia;
  HTMLMediaElement.prototype.play = vi.fn(function (this: HTMLMediaElement) {
    this.dispatchEvent(new Event('play'));
    return Promise.resolve();
  });
  HTMLMediaElement.prototype.pause = vi.fn(function (this: HTMLMediaElement) {
    this.dispatchEvent(new Event('pause'));
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const player = () => screen.getByLabelText(video.alt) as HTMLVideoElement;

describe('ProductVideo', () => {
  it('shows the poster first, silent and inline, with no video file until it is in view', () => {
    render(<ProductVideo video={video} />);
    const el = player();
    expect(el.muted).toBe(true);
    expect(el.hasAttribute('playsinline')).toBe(true);
    expect(el.getAttribute('preload')).toBe('none');
    expect(el.getAttribute('src')).toBeNull();
    expect(el.getAttribute('poster')).toBe(
      'https://res.cloudinary.com/ma/video/upload/so_0,f_auto,q_auto,c_limit,w_720/products/imported/DHN-02/dhnk2-VID.jpg',
    );
  });

  it('loads the silent 720 px file once in view, plays, and pauses out of view', () => {
    render(<ProductVideo video={video} />);
    act(() => observed!(true));
    expect(player().getAttribute('src')).toContain('/video/upload/ac_none,c_limit,w_720');
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Pause video' })).toBeTruthy();

    act(() => observed!(false));
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    expect(player().getAttribute('src')).not.toBeNull(); // keeps the file it already has
  });

  it('pauses when the shopper taps pause, and stays paused', () => {
    render(<ProductVideo video={video} />);
    act(() => observed!(true));
    fireEvent.click(screen.getByRole('button', { name: 'Pause video' }));
    expect(screen.getByRole('button', { name: 'Play video' })).toBeTruthy();
    vi.mocked(HTMLMediaElement.prototype.play).mockClear();
    act(() => observed!(true));
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  it('with reduced motion, shows only the poster until the shopper taps play', () => {
    reducedMotion = true;
    render(<ProductVideo video={video} />);
    act(() => observed!(true));
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Play video' }));
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it('pauses while the tab is hidden', () => {
    render(<ProductVideo video={video} />);
    act(() => observed!(true));
    vi.mocked(HTMLMediaElement.prototype.pause).mockClear();
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  });
});
