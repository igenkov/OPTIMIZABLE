'use client';
import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold uppercase tracking-widest text-[#9A9A9A]">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={`px-3 py-2.5 text-sm bg-[#1f1f1f] border text-white placeholder-[#4A4A4A] transition-colors
          ${error ? 'border-[#FF5252]' : 'border-[rgba(255,255,255,0.07)] focus:border-[#C8A2C8]'}
          ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-[#FF5252]">{error}</span>}
    </div>
  )
);
Input.displayName = 'Input';
