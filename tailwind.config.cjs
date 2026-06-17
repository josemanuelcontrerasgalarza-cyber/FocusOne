/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#030308',
        abyss: '#06070F',
        surface: 'rgba(20,24,44,0.55)',
        'surface-hi': 'rgba(30,36,62,0.70)',
        core: '#5EEAD4',
        plasma: '#8B5CF6',
        solar: '#F59E0B',
        nova: '#FB7185',
        ink: '#F2F4FF',
        'ink-dim': 'rgba(242,244,255,0.55)',
        'ink-ghost': 'rgba(242,244,255,0.28)',
        'glass-border': 'rgba(140,160,255,0.14)',
        'glass-border-hi': 'rgba(140,160,255,0.28)',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        data: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'glow-core': '0 0 24px rgba(94,234,212,0.35), 0 0 96px rgba(94,234,212,0.12)',
        'glow-plasma': '0 0 24px rgba(139,92,246,0.40), 0 0 96px rgba(139,92,246,0.14)',
        'glow-solar': '0 0 24px rgba(245,158,11,0.38), 0 0 96px rgba(245,158,11,0.12)',
        'glow-nova': '0 0 24px rgba(251,113,133,0.38), 0 0 96px rgba(251,113,133,0.12)',
        'card': '0 4px 24px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.5)',
      },
      keyframes: {
        'plasma-flow': {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        float: 'float 4s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.4s ease-out',
      },
    },
  },
  plugins: [],
}
