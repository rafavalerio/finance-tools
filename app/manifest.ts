import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Finance Tools',
    short_name: 'Finance Tools',
    description: 'Personal finance tools for budgeting, mortgage planning, and more',
    start_url: '/',
    display: 'standalone',
    background_color: '#262624',
    theme_color: '#d97757',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
