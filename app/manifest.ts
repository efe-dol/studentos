import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'StudentOS',
    short_name: 'StudentOS',
    description: 'Gymnasium Weilheim i.OB - Deine zentrale Plattform',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    icons: [
      {
        src: '/next.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
