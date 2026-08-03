/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // === Sistema anterior (HORIZON / cosmos) — se mantiene para no
        // romper las pantallas existentes mientras migramos a La Fragua ===
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

        // === Sistema visual "La Fragua" ===
        // Canvas casi negro: el taller apagado.
        forge: {
          canvas: '#0B0C0E', // fondo principal
          surface: '#141518', // paneles / tarjetas
          raised: '#1C1E22', // hover y superficies elevadas
          line: 'rgba(255,255,255,0.08)', // bordes sutiles
          ink: '#F4F1EA', // texto principal (blanco cálido)
          'ink-dim': 'rgba(244,241,234,0.60)', // texto secundario
          // 0.48 en vez de 0.30: la anterior daba ~2.5:1 de contraste sobre el
          // canvas, por debajo del mínimo WCAG AA (4.5:1) para texto normal.
          'ink-faint': 'rgba(244,241,234,0.48)', // texto deshabilitado / hints
        },
        // Ember: acento ÚNICO reservado a la misión activa y el timer.
        ember: {
          DEFAULT: '#FF6A2B',
          bright: '#FFB13B',
        },
        // Metal: dorado reservado a la racha.
        metal: {
          DEFAULT: '#C9A15C',
          dim: 'rgba(201,161,92,0.55)',
        },
      },
      fontFamily: {
        // Variables inyectadas por next/font (fuentes autoalojadas). Fallback a
        // fuentes de sistema si la variable no está disponible.
        // Sistema anterior
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        data: ['var(--font-data)', 'ui-monospace', 'monospace'],
        // La Fragua: Sora para display/UI, IBM Plex Mono para NÚMEROS.
        forge: ['var(--font-forge)', 'system-ui', 'sans-serif'],
        num: ['var(--font-num)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        forge: '16px', // radio estándar de las tarjetas de La Fragua
      },
      boxShadow: {
        'glow-core': '0 0 24px rgba(94,234,212,0.35), 0 0 96px rgba(94,234,212,0.12)',
        'glow-plasma': '0 0 24px rgba(139,92,246,0.40), 0 0 96px rgba(139,92,246,0.14)',
        'glow-solar': '0 0 24px rgba(245,158,11,0.38), 0 0 96px rgba(245,158,11,0.12)',
        'glow-nova': '0 0 24px rgba(251,113,133,0.38), 0 0 96px rgba(251,113,133,0.12)',
        card: '0 4px 24px rgba(0,0,0,0.35), 0 1px 2px rgba(0,0,0,0.5)',
        // Resplandor del acento ember (misión activa / timer).
        ember: '0 0 24px rgba(255,106,43,0.30), 0 0 72px rgba(255,106,43,0.10)',
      },
      backgroundImage: {
        // Gradiente ember reutilizable (barra de calor, botón de misión).
        ember: 'linear-gradient(120deg, #FF6A2B 0%, #FFB13B 100%)',
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
