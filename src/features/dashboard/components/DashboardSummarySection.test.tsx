import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DashboardSummarySection } from '@/features/dashboard/components/DashboardSummarySection'

describe('DashboardSummarySection', () => {
  it('renders every documented count, including zero values', () => {
    render(
      <DashboardSummarySection
        resumen={{
          total: 0,
          borrador: 0,
          publicados: 0,
          enCurso: 0,
          finalizados: 0,
          cancelados: 0,
        }}
      />,
    )

    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('Borrador')).toBeInTheDocument()
    expect(screen.getByText('Publicados')).toBeInTheDocument()
    expect(screen.getByText('En curso')).toBeInTheDocument()
    expect(screen.getByText('Finalizados')).toBeInTheDocument()
    expect(screen.getByText('Cancelados')).toBeInTheDocument()
    expect(screen.getAllByText('0')).toHaveLength(6)
  })

  it('renders populated counts', () => {
    render(
      <DashboardSummarySection
        resumen={{
          total: 12,
          borrador: 2,
          publicados: 5,
          enCurso: 1,
          finalizados: 3,
          cancelados: 1,
        }}
      />,
    )

    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('renders "No disponible" when resumen is null, not a spinner', () => {
    render(<DashboardSummarySection resumen={null} />)

    expect(screen.getByText('No disponible.')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
