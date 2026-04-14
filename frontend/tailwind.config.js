/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        corporate: {
          DEFAULT: '#9C2A3E',
          50: '#fdf2f4',
          100: '#fce7eb',
          200: '#f9d0d9',
          300: '#f4a9ba',
          400: '#ec7a95',
          500: '#9C2A3E',
          600: '#8a2536',
          700: '#741f2e',
          800: '#5e1a26',
          900: '#4a1520',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      animation: {
        'scan-line': 'scan-line 4s linear infinite',
        'pulse-ring': 'pulse-ring 2s infinite',
        float: 'float 4s ease-in-out infinite',
        'eye-blink': 'eye-blink 4s infinite',
        'bot-glow': 'bot-glow 3s infinite',
        'spin-slow': 'spin-slow 3s linear infinite',
        'spin-reverse': 'spin-reverse 2s linear infinite',
        shimmer: 'shimmer 2s linear infinite',
        scan: 'scan 2.5s linear infinite',
      },
      keyframes: {
        'scan-line': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '50%': { opacity: '1' },
          '100%': { transform: 'translateY(400%)', opacity: '0' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(200%)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '0.5' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'spin-reverse': {
          from: { transform: 'rotate(360deg)' },
          to: { transform: 'rotate(0deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'eye-blink': {
          '0%, 90%, 100%': { transform: 'scaleY(1)' },
          '95%': { transform: 'scaleY(0.1)' },
        },
        'bot-glow': {
          '0%, 100%': { boxShadow: '0 0 10px rgba(156, 42, 62, 0.2)' },
          '50%': { boxShadow: '0 0 30px rgba(156, 42, 62, 0.6)' },
        },
      },
    },
  },
  plugins: [],
};
