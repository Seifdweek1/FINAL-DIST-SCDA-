/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        soc: {
          void: '#000000',
          deep: '#0a0a0a',
          panel: '#141414',
          ink: '#050505',
          line: '#1f1f1f',
        },
        neon: {
          cyan: '#A855F7',
          blue: '#7C3AED',
          purple: '#F97316',
          magenta: '#E11D48',
          green: '#22C55E',
          amber: '#FB923C',
        },
        accent: {
          purple: '#A855F7',
          'purple-light': '#C084FC',
          'purple-dark': '#7E22CE',
          orange: '#F97316',
          'orange-light': '#FB923C',
          'orange-dark': '#EA580C',
        },
        brand: {
          400: '#A855F7',
          500: '#9333EA',
          600: '#7E22CE',
        },
        theme: {
          panel: '#141414',
          deep: '#0a0a0a',
          line: 'rgba(255, 255, 255, 0.1)',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(168, 85, 247, 0.25), 0 12px 40px -8px rgba(0, 0, 0, 0.8)',
        'glow-cyan': '0 0 0 1px rgba(168, 85, 247, 0.5), 0 0 32px -4px rgba(168, 85, 247, 0.25)',
        'glow-purple': '0 0 0 1px rgba(249, 115, 22, 0.45), 0 0 28px -4px rgba(249, 115, 22, 0.2)',
        'glow-magenta': '0 0 0 1px rgba(225, 29, 72, 0.35), 0 0 24px -4px rgba(225, 29, 72, 0.12)',
        'glow-green': '0 0 0 1px rgba(34, 197, 94, 0.35), 0 0 20px -4px rgba(34, 197, 94, 0.12)',
        card: '0 4px 24px -4px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(168, 85, 247, 0.1)',
        'card-hover': '0 8px 32px -6px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(249, 115, 22, 0.35)',
      },
      backgroundImage: {
        'grid-pattern':
          'linear-gradient(rgba(168, 85, 247, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(249, 115, 22, 0.03) 1px, transparent 1px)',
        'soc-radial':
          'radial-gradient(ellipse 80% 60% at 20% -10%, rgba(168, 85, 247, 0.18), transparent 50%), radial-gradient(ellipse 60% 50% at 90% 100%, rgba(249, 115, 22, 0.12), transparent 45%)',
        'auth-gradient': 'linear-gradient(160deg, #000000 0%, #0a0a0a 50%, #111111 100%)',
        'accent-bar': 'linear-gradient(90deg, #7E22CE, #A855F7, #F97316, #FB923C, #A855F7)',
      },
      backgroundSize: {
        grid: '48px 48px',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'msg-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'progress-indeterminate': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(350%)' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.45s ease-out forwards',
        'msg-in': 'msg-in 0.3s ease-out forwards',
        shimmer: 'shimmer 1.2s ease-in-out infinite',
        float: 'float 3.5s ease-in-out infinite',
        'progress-indeterminate': 'progress-indeterminate 1.4s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 6s ease infinite',
        'pulse-glow': 'pulse-glow 2.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
