import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageContainer } from './PageContainer'

describe('PageContainer', () => {
  it('renders its children', () => {
    render(
      <PageContainer>
        <p>Content</p>
      </PageContainer>,
    )
    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('applies the shared width and padding classes', () => {
    render(
      <PageContainer>
        <p>Content</p>
      </PageContainer>,
    )
    const container = screen.getByText('Content').parentElement
    expect(container).toHaveClass('max-w-[1600px]', 'mx-auto', 'px-4', 'sm:px-6', 'lg:px-8')
  })

  it('merges an additional className', () => {
    render(
      <PageContainer className="py-8">
        <p>Content</p>
      </PageContainer>,
    )
    const container = screen.getByText('Content').parentElement
    expect(container).toHaveClass('py-8', 'max-w-[1600px]')
  })
})
