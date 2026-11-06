'use client';

import { cloudNameOf, videoDeliveryUrl, videoPosterUrl } from '@mustafa/core/media-url';
import { useEffect, useRef, useState } from 'react';

import type { SuitMedia } from '../../lib/types';

type Props = { video: SuitMedia; className?: string };

// Reduced motion or Save-Data: the poster only, until the shopper taps play (docs/design.md §5.2).
function prefersStill() {
  if (typeof window === 'undefined') return true;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const saveData =
    (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData ??
    false;
  return reduced || saveData;
}

function PlayIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="currentColor">
      <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
    </svg>
  );
}

/**
 * A suit's video (§5.2): the poster first, and no video file until the tile is in view. Silent,
 * inline, looping; plays only while in view and the tab is showing, with a pause button always
 * there. Never in grids, and never the first item, so it is never the page's largest paint.
 */
export function ProductVideo({ video, className = '' }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const player = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  // A tap on play is consent to play, even with reduced motion or Save-Data.
  const tapped = useRef(false);

  const cloud = cloudNameOf(video.url);
  const src = cloud ? videoDeliveryUrl(cloud, video.publicId) : video.url;
  const poster = cloud ? videoPosterUrl(cloud, video.publicId, video.posterPublicId) : undefined;

  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry!.isIntersecting;
        setInView(visible);
        if (visible) setLoaded(true); // attach the source the first time it shows
      },
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Plays while in view and the tab is showing, unless still or paused by the shopper.
  useEffect(() => {
    const el = player.current;
    if (!el || !loaded) return;
    const update = () => {
      const allowed = tapped.current || !prefersStill();
      const shouldPlay = inView && !document.hidden && allowed && !userPaused;
      if (shouldPlay) void el.play()?.catch(() => setPlaying(false));
      else el.pause();
    };
    update();
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, [inView, loaded, userPaused]);

  const toggle = () => {
    const el = player.current;
    if (!el) return;
    setLoaded(true);
    if (playing) {
      setUserPaused(true);
      el.pause();
    } else {
      setUserPaused(false);
      tapped.current = true;
      void el.play()?.catch(() => setPlaying(false));
    }
  };

  return (
    <div
      ref={box}
      className={`relative mx-auto bg-surface-soft ${className}`}
      style={{ aspectRatio: `${video.width} / ${video.height}`, maxHeight: '80vh' }}
    >
      <video
        ref={player}
        aria-label={video.alt}
        muted
        playsInline
        loop
        preload="none"
        poster={poster}
        src={loaded ? src : undefined}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        className="size-full object-contain"
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? 'Pause video' : 'Play video'}
        className="absolute right-3 bottom-3 inline-flex size-11 items-center justify-center rounded-full bg-action text-action-fg"
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
    </div>
  );
}
