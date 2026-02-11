import React from 'react';

import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

/**
 * Componente Button reutilizable siguiendo el sistema de diseño CIOR
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center gap-2 font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      primary:
        'bg-corporate text-white hover:shadow-xl hover:shadow-corporate/30 border-none',
      secondary:
        'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50',
      ghost: 'bg-transparent text-corporate hover:bg-corporate/5',
    };

    const sizes = {
      sm: 'px-6 py-2 rounded-xl text-[9px]',
      md: 'px-10 py-4 rounded-2xl text-[10px]',
      lg: 'px-12 py-5 rounded-[2rem] text-xs',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
