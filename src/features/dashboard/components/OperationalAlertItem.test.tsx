import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { OperationalAlertItem } from '@/features/dashboard/components/OperationalAlertItem'
import type { OperationalAlertViewModel } from '@/features/dashboard/types/dashboard'

const ALERT: OperationalAlertViewModel = {
  idAlerta: 'dashboard-alerta-demo-1',
  tipo: 'insumo_agotado',
  severidad: 'critica',
  mensaje: 'Se agotó el ron blanco en la barra del evento en curso.',
  codigoRelacionado: 'SGEB-4009',
  estado: 'abierta',
  creadaEn: '2026-08-05T08:40:00',
}

describe('OperationalAlertItem', () => {
  it('renders mensaje as the primary text, and severity/state as readable text (not color-only)', () => {
    render(
      <ul>
        <OperationalAlertItem alert={ALERT} />
      </ul>,
    )

    expect(screen.getByText(ALERT.mensaje)).toBeInTheDocument()
    expect(screen.getByText('Crítica')).toBeInTheDocument()
    expect(screen.getByText('Abierta')).toBeInTheDocument()
    expect(screen.getByText('Insumo agotado')).toBeInTheDocument()
  })

  it('renders codigoRelacionado only as secondary, support-facing text', () => {
    render(
      <ul>
        <OperationalAlertItem alert={ALERT} />
      </ul>,
    )

    expect(screen.getByText(/Código de referencia: SGEB-4009/)).toBeInTheDocument()
  })

  it('omits the codigoRelacionado line entirely when null', () => {
    render(
      <ul>
        <OperationalAlertItem alert={{ ...ALERT, codigoRelacionado: null }} />
      </ul>,
    )

    expect(screen.queryByText(/Código de referencia/)).not.toBeInTheDocument()
  })

  it('never renders a technical_message field — the view model has none', () => {
    render(
      <ul>
        <OperationalAlertItem alert={ALERT} />
      </ul>,
    )

    expect(screen.queryByText(/technical_message/i)).not.toBeInTheDocument()
  })

  it('renders no dismiss action', () => {
    render(
      <ul>
        <OperationalAlertItem alert={ALERT} />
      </ul>,
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
