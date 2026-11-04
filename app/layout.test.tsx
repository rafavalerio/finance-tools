import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('next/font/google', () => ({
  Geist: () => ({ variable: '--font-geist-sans' }),
  Geist_Mono: () => ({ variable: '--font-geist-mono' }),
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
    expect(html).toContain('Mortgage Planner')
  })

  it('sets the page metadata', () => {
    expect(metadata.title).toBe('Mortgage Planner')
    expect(metadata.description).toBe('Plan your Australian home loan, repayments, and purchase costs')
  })
})
