import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CurrentOperationSection } from '@/features/dashboard/components/CurrentOperationSection'

describe('CurrentOperationSection', () => {
  it('renders "No disponible" when operacion is null', () => {
    render(<CurrentOperationSection operacion={null} />)

    expect(screen.getByText('No disponible.')).toBeInTheDocument()
  })

  it('renders the no-current-event message when idEvento/titulo are both null', () => {
    render(
      <CurrentOperationSection
        operacion={{
          idEvento: null,
          titulo: null,
          meserosEnPiso: 0,
          mesasOcupadas: 0,
          mesasTotal: 0,
          ordenesActivas: 0,
          solicitudesPendientes: 0,
        }}
      />,
    )

    expect(screen.getByText('No hay ningún evento en curso.')).toBeInTheDocument()
  })

  it('renders populated operation fields, never the opaque idEvento as visible text', () => {
    render(
      <CurrentOperationSection
        operacion={{
          idEvento: 'dashboard-evento-demo-3',
          titulo: 'Evento de demostración — en curso',
          meserosEnPiso: 8,
          mesasOcupadas: 10,
          mesasTotal: 12,
          ordenesActivas: 4,
          solicitudesPendientes: 1,
        }}
      />,
    )

    expect(screen.getByText('Evento de demostración — en curso')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.queryByText('dashboard-evento-demo-3')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
