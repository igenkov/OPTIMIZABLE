'use client';

import { useEffect, useRef } from 'react';

/** Drop `hero-bg.mp4` into `/public`. Tune overlay opacity if the hero feels too dim or busy. */
const DEFAULT_SRC = '/hero-bg.mp4';

export function HomeVideoBackground({
  src = DEFAULT_SRC,
  overlayOpacityClassName = 'bg-bg/72',
}: {
  src?: string;
  /** Tailwind bg-* classes for the fixed tint above video (below dots/grids). */
  overlayOpacityClassName?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      if (mq.matches) {
        v.pause();
        try {
          v.currentTime = 0;
        } catch {
          /* noop */
        }
      } else {
        void v.play().catch(() => {});
      }
    };

    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return (
    <>
      <video
        ref={ref}
        className="pointer-events-none fixed inset-0 z-0 h-[100dvh] min-h-full w-full object-cover"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-hidden
      >
        <source src={src} type="video/mp4" />
      </video>
      <div className={`pointer-events-none fixed inset-0 z-[1] ${overlayOpacityClassName}`} aria-hidden />
    </>
  );
}
