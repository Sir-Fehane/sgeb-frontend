import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RouteHydrateFallback } from '@/features/route-errors/components/RouteHydrateFallback'

describe('RouteHydrateFallback', () => {
  it('renders exactly one accessible status region with useful loading text', () => {
    render(<RouteHydrateFallback />)

    // getByRole (not getAllByRole) already asserts exactly one match.
    const statusRegion = screen.getByRole('status')
    expect(within(statusRegion).getByText('Cargando la aplicación')).toBeInTheDocument()
  })

  it('renders no error or stale page content', () => {
    render(<RouteHydrateFallback />)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
