import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#111111',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '6px',
          fontFamily: 'sans-serif',
          fontWeight: 900,
          fontSize: 15,
          letterSpacing: '-0.5px',
        }}
      >
        <span style={{ color: '#f97316' }}>V</span>
        <span style={{ color: '#ffffff' }}>S</span>
      </div>
    ),
    { ...size },
  )
}
