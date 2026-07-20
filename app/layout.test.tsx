import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('next/font/google', () => ({
  Geist: () => ({ variable: '--font-geist-sans' }),
  Geist_Mono: () => ({ variable: '--font-geist-mono' }),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
}))

const { default: RootLayout, metadata } = await import('./layout')

describe('RootLayout', () => {
  it('renders its children', () => {
    const html = renderToStaticMarkup(
      <RootLayout>
        <p>Page content</p>
      </RootLayout>,
    )
    expect(html).toContain('Page content')
    expect(html).toContain('lang="en"')
  })

  it('renders the persistent top nav', () => {
    const html = renderToStaticMarkup(
      <RootLayout>
        <p>Page content</p>
      </RootLayout>,
    )
    expect(html).toContain('Finance Tools')
    expect(html).toContain('/tools/mortgage')
  })

  it('sets the page metadata', () => {
    expect(metadata.title).toBe('Finance Tools')
    expect(metadata.description).toBe(
      'Personal finance tools for budgeting, mortgage planning, and more',
    )
  })
})
