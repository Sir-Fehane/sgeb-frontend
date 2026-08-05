import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ClosingSummarySection } from '@/features/dashboard/components/ClosingSummarySection'

describe('ClosingSummarySection', () => {
  it('renders "No disponible" when cierre is null', () => {
    render(<ClosingSummarySection cierre={null} />)

    expect(screen.getByText('No disponible.')).toBeInTheDocument()
  })

  it('formats monetary fields as MXN and renders a null rating as "Sin calificaciones"', () => {
    render(
      <ClosingSummarySection
        cierre={{
          eventosSinPagosCalculados: 2,
          pagosPendientes: 5,
          montoPendiente: 12500.5,
          mermaCostoEstimado: 850.25,
          calificacionPromedio: null,
        }}
      />,
    )

    expect(screen.getByText(/12,500\.50/)).toBeInTheDocument()
    expect(screen.getByText(/850\.25/)).toBeInTheDocument()
    expect(screen.getByText('Sin calificaciones')).toBeInTheDocument()
  })

  it('renders zero amounts as valid values, not "No disponible"', () => {
    render(
      <ClosingSummarySection
        cierre={{
          eventosSinPagosCalculados: 0,
          pagosPendientes: 0,
          montoPendiente: 0,
          mermaCostoEstimado: 0,
          calificacionPromedio: 4.6,
        }}
      />,
    )

    expect(screen.getByText('4.6 / 5')).toBeInTheDocument()
    expect(screen.queryByText('No disponible.')).not.toBeInTheDocument()
  })

  it('never renders a payment action', () => {
    render(
      <ClosingSummarySection
        cierre={{
          eventosSinPagosCalculados: 2,
          pagosPendientes: 5,
          montoPendiente: 12500.5,
          mermaCostoEstimado: 850.25,
          calificacionPromedio: 4.6,
        }}
      />,
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
