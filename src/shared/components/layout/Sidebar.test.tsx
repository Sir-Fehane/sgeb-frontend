import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { Sidebar } from '@/shared/components/layout/Sidebar'

function renderSidebar(collapsed: boolean) {
  return render(
    <MemoryRouter>
      <Sidebar collapsed={collapsed} onToggleCollapsed={vi.fn()} />
    </MemoryRouter>,
  )
}

describe('Sidebar branding', () => {
  it('renders the real brand mark instead of the old "SG" text badge, expanded', () => {
    const { container } = renderSidebar(false)

    expect(screen.queryByText('SG')).not.toBeInTheDocument()
    expect(screen.getByText('SGEB')).toBeInTheDocument()

    const logo = container.querySelector('img')
    expect(logo).toHaveAttribute('src', expect.stringContaining('image/svg+xml'))
    expect(logo).toHaveAttribute('alt', '')
  })

  it('keeps the brand mark visible when collapsed, without the "SGEB" wordmark', () => {
    const { container } = renderSidebar(true)

    expect(screen.queryByText('SG')).not.toBeInTheDocument()
    expect(screen.queryByText('SGEB')).not.toBeInTheDocument()
    expect(container.querySelector('img')).toBeInTheDocument()
  })
})
