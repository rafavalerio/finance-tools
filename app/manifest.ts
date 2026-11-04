import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mortgage Planner',
    short_name: 'Mortgage Planner',
    description: 'Plan your Australian home loan, repayments, and purchase costs',
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
