'use client';

import { useEffect, useRef } from 'react';

/** Drop `hero-bg.mp4` into `/public`. Tune overlay opacity if the hero feels too dim or busy. */
const DEFAULT_SRC = '/hero-bg.mp4';

export function HomeVideoBackground({
  src = DEFAULT_SRC,
  overlayOpacityClassName = 'bg-bg/72',
  /** Soft darkening toward edges — hides obvious bands when using `object-contain`. */
  edgeVignette = true,
}: {
  src?: string;
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
      {/* Mobile/portrait: `cover` fills the viewport (hero-style). `lg+`: `contain` shows full frame + vignette hides bands. */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-bg" aria-hidden>
        <video
          ref={ref}
          className="pointer-events-none absolute inset-0 z-0 size-full object-cover object-center lg:object-contain"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          aria-hidden
        >
          <source src={src} type="video/mp4" />
        </video>
        {edgeVignette && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[1] hidden lg:block"
            style={{
              background: `
                radial-gradient(
                  ellipse 90% 82% at 50% 48%,
                  transparent 18%,
                  color-mix(in oklch, var(--color-bg) 42%, transparent) 52%,
                  color-mix(in oklch, var(--color-bg) 85%, black) 100%
                ),
                linear-gradient(
                  to bottom,
                  color-mix(in oklch, var(--color-bg) 58%, transparent) 0%,
                  transparent 22%,
                  transparent 78%,
                  color-mix(in oklch, var(--color-bg) 58%, transparent) 100%
                ),
                linear-gradient(
                  to right,
                  color-mix(in oklch, var(--color-bg) 48%, transparent) 0%,
                  transparent 15%,
                  transparent 85%,
                  color-mix(in oklch, var(--color-bg) 48%, transparent) 100%
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
