import { ImageResponse } from 'next/og'

// Icono para pantallas de inicio de iOS (180x180), generado en build.
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F1012' }}>
        <svg width="124" height="124" viewBox="0 0 32 32">
          <path d="M25.4 12.58A10 10 0 1 1 17.74 6.15" fill="none" stroke="#F2EEE6" strokeWidth="3.2" strokeLinecap="round" />
          <circle cx="22.43" cy="8.34" r="2.7" fill="#C9F24D" />
        </svg>
      </div>
    ),
    { ...size },
  )
}
