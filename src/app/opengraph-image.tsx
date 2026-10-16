import { ImageResponse } from 'next/og'

// Imagen social (Open Graph / Twitter) de Kairo, generada en build (1200x630).
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'Kairo — Lo importante, ahora.'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#F5F2EA',
          padding: '80px 90px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <svg width="76" height="76" viewBox="0 0 32 32">
            <path d="M25.4 12.58A10 10 0 1 1 17.74 6.15" fill="none" stroke="#18191B" strokeWidth="3.2" strokeLinecap="round" />
            <circle cx="22.43" cy="8.34" r="2.7" fill="#9BC41F" />
          </svg>
          <div style={{ fontSize: 64, fontWeight: 700, color: '#18191B', letterSpacing: -2 }}>kairo</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 92, fontWeight: 700, color: '#18191B', letterSpacing: -3, lineHeight: 1.02 }}>
            Lo importante,
          </div>
          <div style={{ fontSize: 92, fontWeight: 700, color: '#4C6606', letterSpacing: -3, lineHeight: 1.02 }}>
            ahora.
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 30, color: '#5B5850' }}>
          Tareas · Enfoque · Proyectos · Objetivos · Asistente
        </div>
      </div>
    ),
    { ...size },
  )
}
