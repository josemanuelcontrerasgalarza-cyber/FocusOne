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
        core: '#5EEAD4',
        plasma: '#8B5CF6',
        solar: '#F59E0B',
        nova: '#FB7185',
        ink: '#F2F4FF',
        'ink-dim': 'rgba(242,244,255,0.55)',
        'ink-ghost': 'rgba(242,244,255,0.28)',
        'glass-border': 'rgba(140,160,255,0.14)',

        // === Sistema visual "La Fragua" ===
        // Canvas casi negro: el taller apagado.
        forge: {
          canvas: '#0B0C0E', // fondo principal
          surface: '#141518', // paneles / tarjetas
          raised: '#1C1E22', // hover y superficies elevadas
          line: 'rgba(255,255,255,0.08)', // bordes sutiles
          ink: '#F4F1EA', // texto principal (blanco cálido)
          'ink-dim': 'rgba(244,241,234,0.60)', // texto secundario
          'ink-faint': 'rgba(244,241,234,0.30)', // texto deshabilitado / hints
        },
        // Ember: acento ÚNICO reservado a la misión activa y el timer.
        // No usar para decoración genérica.
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
        // Sistema anterior
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        data: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
        // La Fragua: Sora para display/UI, IBM Plex Mono para NÚMEROS
        // (timer, puntos, racha).
        forge: ['Sora', 'system-ui', 'sans-serif'],
        num: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        forge: '16px', // radio estándar de las tarjetas de La Fragua
      },
      boxShadow: {
        'glow-core': '0 0 24px rgba(94,234,212,0.35), 0 0 96px rgba(94,234,212,0.12)',
        'glow-plasma': '0 0 24px rgba(139,92,246,0.40), 0 0 96px rgba(139,92,246,0.14)',
        // Resplandor del acento ember (misión activa / timer).
        ember: '0 0 24px rgba(255,106,43,0.30), 0 0 72px rgba(255,106,43,0.10)',
      },
      backgroundImage: {
        // Gradiente ember reutilizable (barra de calor, botón de misión).
        ember: 'linear-gradient(120deg, #FF6A2B 0%, #FFB13B 100%)',
      },
    },
  },
  plugins: [],
}
