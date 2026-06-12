/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#030308',
        abyss: '#06070F',
        core: '#5EEAD4',
        plasma: '#8B5CF6',
        solar: '#F59E0B',
        nova: '#FB7185',
        ink: '#F2F4FF',
        'ink-dim': 'rgba(242,244,255,0.55)',
        'ink-ghost': 'rgba(242,244,255,0.28)',
        'glass-border': 'rgba(140,160,255,0.14)',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        data: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'glow-core': '0 0 24px rgba(94,234,212,0.35), 0 0 96px rgba(94,234,212,0.12)',
        'glow-plasma': '0 0 24px rgba(139,92,246,0.40), 0 0 96px rgba(139,92,246,0.14)',
      },
    },
  },
  plugins: [],
}
