import { ImageResponse } from 'next/og';

export const size = {
  width: 512,
  height: 512,
};

export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #121826 45%, #1e3a8a 100%)',
          color: '#ffffff',
          fontFamily: 'Arial, sans-serif',
          position: 'relative',
          borderRadius: 112,
        }}
      >
        <div
          style={{
            width: 344,
            height: 344,
            borderRadius: 96,
            border: '3px solid rgba(255,255,255,0.22)',
            background: 'linear-gradient(160deg, rgba(96,165,250,0.35), rgba(59,130,246,0.12))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 80px rgba(59,130,246,0.45)',
          }}
        >
          <span
            style={{
              fontSize: 188,
              fontWeight: 800,
              letterSpacing: -8,
              lineHeight: 1,
            }}
          >
            S
          </span>
        </div>

        <span
          style={{
            position: 'absolute',
            bottom: 32,
            fontSize: 44,
            fontWeight: 700,
            letterSpacing: 0.4,
            color: '#dbeafe',
          }}
        >
          StudentOS
        </span>
      </div>
    ),
    {
      ...size,
    }
  );
}
