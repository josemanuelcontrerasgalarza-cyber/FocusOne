/** @type {import('tailwindcss').Config} */

// Kairo — sistema de diseño. Todos los colores salen de variables CSS con
// canales RGB (definidas en globals.css para claro y oscuro), así cada token
// admite opacidad (`bg-accent/10`) y cambia solo con el tema.
const c = (v) => `rgb(var(--${v}) / <alpha-value>)`

module.exports = {
  darkMode: ['class'],
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: c('canvas'),
        surface: c('surface'),
        raised: c('raised'),
        sunken: c('sunken'),
        line: { DEFAULT: c('line'), strong: c('line-strong') },
        ink: { DEFAULT: c('ink'), dim: c('ink-dim'), faint: c('ink-faint') },
        accent: { DEFAULT: c('accent'), ink: c('accent-ink'), fg: c('accent-fg') },
        warm: c('warm'),
        success: c('success'),
        warning: c('warning'),
        danger: c('danger'),
        info: c('info'),

        // Alias de compatibilidad para pantallas heredadas: apuntan a los
        // tokens nuevos. `ember` usa accent-fg: legible como texto y como
        // relleno con texto `forge-canvas` en ambos temas.
        forge: {
          canvas: c('canvas'),
          surface: c('surface'),
          raised: c('raised'),
          line: c('line'),
          ink: c('ink'),
          'ink-dim': c('ink-dim'),
          'ink-faint': c('ink-faint'),
        },
        ember: { DEFAULT: c('accent-fg'), bright: c('accent') },
        metal: { DEFAULT: c('warm'), dim: c('warm') },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
        // Alias heredados.
        forge: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        num: ['var(--font-mono)', 'ui-monospace', 'monospace'],
        data: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        card: '14px',
        control: '9px',
        forge: '14px',
      },
      boxShadow: {
        hair: '0 1px 0 rgb(var(--shadow) / 0.04)',
        card: '0 1px 2px rgb(var(--shadow) / 0.06), 0 1px 1px rgb(var(--shadow) / 0.03)',
        pop: '0 12px 32px -8px rgb(var(--shadow) / 0.28), 0 2px 6px rgb(var(--shadow) / 0.10)',
        ring: '0 0 0 3px rgb(var(--accent) / 0.30)',
        ember: '0 1px 2px rgb(var(--shadow) / 0.08)',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'none' } },
        'scale-in': { from: { opacity: '0', transform: 'scale(0.97)' }, to: { opacity: '1', transform: 'none' } },
        shimmer: { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
        'check-pop': { '0%': { transform: 'scale(0.6)' }, '60%': { transform: 'scale(1.12)' }, '100%': { transform: 'scale(1)' } },
      },
      animation: {
        'fade-in': 'fade-in 180ms cubic-bezier(0.16,1,0.3,1)',
        'scale-in': 'scale-in 160ms cubic-bezier(0.16,1,0.3,1)',
        shimmer: 'shimmer 1.6s linear infinite',
        'check-pop': 'check-pop 260ms cubic-bezier(0.16,1,0.3,1)',
      },
    },
  },
  plugins: [],
}
