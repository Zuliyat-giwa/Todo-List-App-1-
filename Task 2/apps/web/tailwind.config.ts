import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: { DEFAULT: '#faf6f1', 50: '#fdfbf8', 100: '#f6efe6', 200: '#eee3d5', 300: '#e2d2bd' },
        ink: { DEFAULT: '#1f1a17', soft: '#4a413b', mute: '#6f645c' },
        brand: { DEFAULT: '#c4551d', dark: '#a8450f', light: '#f3d9c8' },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        arabic: ['var(--font-arabic)', 'system-ui', 'sans-serif'],
      },
      boxShadow: { card: '0 1px 2px rgba(31,26,23,.04), 0 8px 24px -12px rgba(31,26,23,.12)' },
    },
  },
  plugins: [],
} satisfies Config;
