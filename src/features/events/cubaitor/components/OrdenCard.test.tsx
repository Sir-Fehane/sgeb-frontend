import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  OrdenCard,
  type OrdenCardProps,
} from '@/features/events/cubaitor/components/OrdenCard'
import type { OrdenViewModel } from '@/features/events/cubaitor/types/eventCubaitor'

const ORDEN_CON_DISPENSADOS: OrdenViewModel = {
  idOrden: 501,
  idMesa: 7,
  idParticipacion: 20,
  estado: 'en_preparacion',
  creadaEn: '2026-08-21T20:00:00Z',
  entregadaEn: null,
  detalles: [
    {
      idDetalle: 1,
      idOrden: 501,
      idBebida: 9,
      idEnvase: 3,
      cantidad: 2,
      volumenTotalMl: 700,
      estado: 'dispensada',
      dispensados: [
        {
          idDispensado: 900,
          idDetalle: 1,
          idConfig: 5,
          volumenSolicitadoMl: 350,
          segundosCalculado: 22.6,
          segundosReal: 22.4,
          volumenRealEstimadoMl: 348,
          estado: 'ok',
          timestamp: '2026-08-21T20:01:00Z',
        },
        {
          idDispensado: 901,
          idDetalle: 1,
          idConfig: 6,
          volumenSolicitadoMl: 45,
          segundosCalculado: 2.9,
          segundosReal: null,
          volumenRealEstimadoMl: null,
          estado: 'ok',
          timestamp: '2026-08-21T20:01:05Z',
        },
      ],
    },
  ],
}

function renderCard(props: Partial<OrdenCardProps> = {}) {
  render(
    <OrdenCard
      orden={ORDEN_CON_DISPENSADOS}
      bebidasById={new Map([[9, 'Mojito']])}
      envasesById={new Map([[3, 'Vaso alto']])}
      actionStatus={undefined}
      actionError={undefined}
      onCambiarEstado={vi.fn()}
      dispensarStatus={{}}
      dispensarError={{}}
      onDispensar={vi.fn()}
      configPinById={new Map([[6, 12]])}
      reportarStatus={{}}
      reportarError={{}}
      onReportar={vi.fn()}
      {...props}
    />,
  )
}

describe('OrdenCard — reload reconstruction from query data', () => {
  it('renders a completed dispensado (segundosReal set) as a read-only result, sourced only from props', () => {
    renderCard()

    expect(screen.getByText('Correcto')).toBeInTheDocument()
    expect(screen.getByText(/348 ml/)).toBeInTheDocument()
  })

  it('renders the manual report fallback for a dispensado still awaiting confirmation (segundosReal null)', () => {
    renderCard()

    expect(screen.getByText(/pin 12, 45 ml/)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Confirmar resultado' }),
    ).toBeInTheDocument()
  })

  it('falls back to omitting the pin label when the config is not (yet) loaded', () => {
    renderCard({ configPinById: new Map() })

    expect(screen.getByText(/Cubaitor: 45 ml/)).toBeInTheDocument()
    expect(screen.queryByText(/pin \d+, 45 ml/)).not.toBeInTheDocument()
  })

  it('hardens the manual "Segundos reales" report against scientific notation — "1e3" never reports as 1000', () => {
    const onReportar = vi.fn()
    renderCard({ onReportar })

    fireEvent.change(screen.getByLabelText('Segundos reales'), {
      target: { value: '1e3' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar resultado' }))

    expect(onReportar).toHaveBeenCalledWith(901, 13)
  })
})
