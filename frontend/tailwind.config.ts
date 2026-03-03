import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0B0F19',
        panel: '#111827',
        panel2: '#0F172A',
        border: '#1F2937',
        accent: '#1D4ED8',
        accentSoft: '#1E3A8A',
        textMain: '#E5E7EB',
        textSub: '#94A3B8',
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444'
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(37, 99, 235, 0.25), 0 12px 32px rgba(15, 23, 42, 0.45)'
      },
      transitionTimingFunction: {
        executive: 'cubic-bezier(0.2, 0.8, 0.2, 1)'
      }
    }
  },
  plugins: []
};

export default config;
