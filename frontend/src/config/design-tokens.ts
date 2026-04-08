/**
 * Design Tokens - CIOR 2026
 * Sistema de diseño centralizado
 */

export const colors = {
  corporate: {
    DEFAULT: '#365583',
    50: '#f0f4f8',
    100: '#d9e3ee',
    200: '#b8cce0',
    300: '#8aadcd',
    400: '#5b8ab8',
    500: '#365583',
    600: '#2d4770',
    700: '#24395c',
    800: '#1b2c48',
    900: '#121f34',
  },
  accent: {
    cyan: '#22d3ee',
    green: '#4ade80',
    amber: '#fbbf24',
    blue: '#3b82f6',
  },
} as const;

export const spacing = {
  section: {
    py: 'py-24 lg:py-32',
    px: 'px-6 lg:px-8',
  },
  container: 'max-w-7xl mx-auto',
} as const;

export const typography = {
  heading: {
    h1: 'text-6xl lg:text-8xl font-black tracking-tighter',
    h2: 'text-4xl lg:text-6xl font-black tracking-tight',
    h3: 'text-2xl lg:text-4xl font-bold tracking-tight',
    h4: 'text-xl lg:text-2xl font-bold',
  },
  body: {
    large: 'text-xl font-medium',
    base: 'text-base font-normal',
    small: 'text-sm font-medium',
  },
  label: {
    large: 'text-xs font-black uppercase tracking-[0.2em]',
    small: 'text-[10px] font-black uppercase tracking-[0.3em]',
  },
} as const;

export const animations = {
  transition: 'transition-all duration-300',
  hover: 'hover:shadow-xl hover:scale-105 transition-all duration-300',
  fadeIn: 'animate-in fade-in duration-500',
  slideIn: 'animate-in slide-in-from-bottom-4 duration-500',
} as const;

export const borderRadius = {
  card: 'rounded-[3rem]',
  button: 'rounded-2xl',
  badge: 'rounded-full',
} as const;
