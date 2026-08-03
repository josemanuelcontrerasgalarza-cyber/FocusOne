import { ImageResponse } from 'next/og'

// Imagen social (Open Graph / Twitter) generada en build. 1200x630, marca
// FocusOne. Refuerza cómo aparece la app al compartirla y en resultados ricos.
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'FocusOne — Termina lo que empiezas'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          background: '#0B0C0E',
          padding: '90px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: '#FF6A2B' }} />
          <div style={{ color: '#9AA0A6', fontSize: 30, letterSpacing: 2 }}>KRATOS LABS</div>
        </div>
        <div style={{ color: '#F5F6F7', fontSize: 128, fontWeight: 800, letterSpacing: -3 }}>
          FocusOne
        </div>
        <div style={{ color: '#C9CDD2', fontSize: 46, marginTop: 10 }}>
          Termina lo que empiezas.
        </div>
        <div style={{ color: '#FF6A2B', fontSize: 34, marginTop: 40 }}>
          Una mision a la vez · timer con calor · racha · recompensas
        </div>
      </div>
    ),
    { ...size },
  )
}
