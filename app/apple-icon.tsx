import { ImageResponse } from 'next/og';

export const size = {
  width: 180,
  height: 180,
};

export const contentType = 'image/png';

export default function AppleIcon() {
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
          borderRadius: 36,
        }}
      >
        <div
          style={{
            width: 124,
            height: 124,
            borderRadius: 34,
            border: '2px solid rgba(255,255,255,0.22)',
            background: 'linear-gradient(160deg, rgba(96,165,250,0.35), rgba(59,130,246,0.12))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 30px rgba(59,130,246,0.45)',
          }}
        >
          <span
            style={{
              fontSize: 78,
              fontWeight: 800,
              letterSpacing: -3,
              lineHeight: 1,
            }}
          >
            S
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
