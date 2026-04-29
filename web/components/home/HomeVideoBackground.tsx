'use client';

import { useEffect, useRef } from 'react';

/** Drop `hero-bg.mp4` into `/public`. Tune overlay opacity if the hero feels too dim or busy. */
const DEFAULT_SRC = '/hero-bg.mp4';

export function HomeVideoBackground({
  src = DEFAULT_SRC,
  mobilePortraitSrc,
  overlayOpacityClassName = 'bg-bg/72',
  /** Soft darkening toward edges — hides obvious bands when using `object-contain`. */
  edgeVignette = true,
}: {
  src?: string;
  /** Optional source used only on portrait mobile screens. */
  mobilePortraitSrc?: string;
  /** Tailwind bg-* classes for the fixed tint above video (below dots/grids). */
  overlayOpacityClassName?: string;
  edgeVignette?: boolean;
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
      {/* Full-bleed `cover` — avoids pillarboxing on wide viewports. */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-bg" aria-hidden>
        <video
          ref={ref}
          className="pointer-events-none absolute inset-0 z-0 size-full object-cover object-center"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          aria-hidden
        >
          {mobilePortraitSrc ? (
            <source
              src={mobilePortraitSrc}
              type="video/mp4"
              media="(max-width: 1023px) and (orientation: portrait)"
            />
          ) : null}
          <source src={src} type="video/mp4" />
        </video>
        {edgeVignette && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[1]"
            style={{
              /* Radial only — avoid left/right linear fades that read as pillarbox “margins”. */
              background: `
                radial-gradient(
                  ellipse 95% 88% at 50% 48%,
                  transparent 20%,
                  color-mix(in oklch, var(--color-bg) 38%, transparent) 58%,
                  color-mix(in oklch, var(--color-bg) 82%, black) 100%
                )
              `,
            }}
          />
        )}
      </div>
      <div className={`pointer-events-none fixed inset-0 z-[1] overflow-hidden ${overlayOpacityClassName}`} aria-hidden />
    </>
  );
}
