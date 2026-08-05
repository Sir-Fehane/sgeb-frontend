import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { OperationalAlertsSection } from '@/features/dashboard/components/OperationalAlertsSection'
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

describe('OperationalAlertsSection', () => {
  it('renders "No disponible" when alertas is null', () => {
    render(<OperationalAlertsSection alertas={null} />)

    expect(screen.getByText('No disponible.')).toBeInTheDocument()
  })

  it('renders "Sin alertas" as a valid state when alertas is an empty array', () => {
    render(<OperationalAlertsSection alertas={[]} />)

    expect(screen.getByText('Sin alertas.')).toBeInTheDocument()
  })

  it('renders populated alerts', () => {
    render(<OperationalAlertsSection alertas={[ALERT]} />)

    expect(screen.getByText(ALERT.mensaje)).toBeInTheDocument()
  })
})
