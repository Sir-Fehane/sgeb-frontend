import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { MobileNavDrawer } from '@/shared/components/layout/MobileNavDrawer'

describe('MobileNavDrawer branding', () => {
  it('renders the real brand mark alongside the "SGEB" wordmark', () => {
    const { container } = render(
      <MemoryRouter>
        <MobileNavDrawer open onClose={vi.fn()} />
      </MemoryRouter>,
    )

    expect(screen.getByText('SGEB')).toBeInTheDocument()

    const logo = container.querySelector('img')
    expect(logo).toHaveAttribute('src', expect.stringContaining('image/svg+xml'))
    expect(logo).toHaveAttribute('alt', '')
  })
})
