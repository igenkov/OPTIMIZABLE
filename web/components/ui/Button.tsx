'use client';
import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({ variant = 'primary', loading, fullWidth, children, className = '', disabled, ...props }: ButtonProps) {
  const base = 'px-6 py-3 text-sm font-bold tracking-widest uppercase transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-[#C8A2C8] text-black hover:bg-[#A882A8]',
    secondary: 'border border-[#C8A2C8] text-[#C8A2C8] bg-transparent hover:bg-[rgba(200,162,200,0.1)]',
    ghost: 'border border-[rgba(255,255,255,0.1)] text-[#9A9A9A] bg-transparent hover:border-[rgba(255,255,255,0.2)] hover:text-white',
    danger: 'border border-[#FF5252] text-[#FF5252] bg-transparent hover:bg-[rgba(255,82,82,0.1)]',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
}
