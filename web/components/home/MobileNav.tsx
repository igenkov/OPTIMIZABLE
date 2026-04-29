'use client';

import { useState } from 'react';
import Link from 'next/link';
import { List, X } from '@phosphor-icons/react';

const links = [
  { href: '/blog', label: 'Blog' },
  { href: '/faq', label: 'FAQ' },
  { href: '/how-it-works', label: 'How It Works' },
  { href: '/login', label: 'Sign In' },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex size-10 items-center justify-center text-lilac transition-colors duration-200 hover:text-white sm:hidden"
      >
        {open ? <X size={20} weight="bold" /> : <List size={20} weight="bold" />}
      </button>

      {open && (
        <div
          className="fixed inset-x-0 top-16 z-40 flex flex-col gap-0 border-b border-white/[0.08] bg-black/90 backdrop-blur-md sm:hidden"
          onClick={() => setOpen(false)}
        >
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="font-display border-t border-white/[0.06] px-6 py-4 text-[11px] font-bold uppercase tracking-[0.14em] text-label transition-colors duration-200 hover:bg-white/[0.04] hover:text-white"
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
