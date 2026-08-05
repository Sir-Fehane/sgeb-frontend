import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CaptainDashboardHeader } from '@/features/dashboard/components/CaptainDashboardHeader'

describe('CaptainDashboardHeader', () => {
  it('presents the response-generated timestamp, not a raw ISO string', () => {
    render(
      <CaptainDashboardHeader
        generadoEn="2026-08-05T09:00:00"
        rango={{ fechaDesde: '2026-08-05', fechaHasta: '2026-09-04' }}
      />,
    )

    expect(screen.getByText(/Datos generados:/)).toBeInTheDocument()
    expect(screen.queryByText('2026-08-05T09:00:00')).not.toBeInTheDocument()
  })

  it('presents the response range (rango), not raw ISO date strings', () => {
    render(
      <CaptainDashboardHeader
        generadoEn="2026-08-05T09:00:00"
        rango={{ fechaDesde: '2026-08-05', fechaHasta: '2026-09-04' }}
      />,
    )

    expect(screen.getByText(/Periodo consultado:/)).toBeInTheDocument()
    expect(screen.getByText(/05\/08\/2026/)).toBeInTheDocument()
    expect(screen.getByText(/04\/09\/2026/)).toBeInTheDocument()
    expect(screen.queryByText('2026-08-05')).not.toBeInTheDocument()
  })
})
