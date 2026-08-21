import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import {
  EventDashboardContent,
  type EventDashboardContentProps,
} from '@/features/events/dashboard/components/EventDashboardContent'
import type { EventDashboardViewModel } from '@/features/events/dashboard/types/dashboard'

const FULL_DASHBOARD: EventDashboardViewModel = {
  idEvento: 1001,
  titulo: 'Boda Pérez',
  estado: 'en_curso',
  fecha: '2026-09-12',
  salon: 'Jardín Central',
  resumen: {
    cupoMeseros: 10,
    inscritos: 8,
    disponibles: 2,
    mesas: 20,
    tarifaPorMesero: 350,
  },
  asistencia: { porEstado: { vinculo: 6 }, llegadasFallidas: 0 },
  montaje: { participaciones: 8, checklistAprobado: 5, instanciasAbiertas: 3 },
  piso: { mesasPorEstado: { libre: 15, ocupada: 5 }, asignacionesVinculadas: 8 },
  barra: {
    pendientes: 2,
    enPreparacion: 1,
    dispensando: 0,
    pausadasPorInsumo: 0,
    entregadas: 10,
    canceladas: 1,
    dispensadosPorEstado: { ok: 10 },
  },
  servicio: {
    solicitudesPendientes: 3,
    calificaciones: 4,
    promedioCalificacion: 4.5,
    calificacionesBajas: 0,
  },
  alertas: { alertas: [], total: 0, ordenesPausadas: 0, severidadMaxima: null },
  partial: false,
}

function renderContent(props: Partial<EventDashboardContentProps> = {}) {
  return render(
    <MemoryRouter>
      <EventDashboardContent
        idEvento={1001}
        dashboard={FULL_DASHBOARD}
        isLoading={false}
        onRetry={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  )
}

describe('EventDashboardContent — states', () => {
  it('renders the loading state when isLoading is true', () => {
    renderContent({ isLoading: true, dashboard: null })
    expect(
      screen.getByRole('status', { name: 'Cargando panel operativo' }),
    ).toBeInTheDocument()
  })

  it('renders the error state when errorMessage is set', () => {
    renderContent({
      dashboard: null,
      errorMessage: 'No pudimos comunicarnos con el servidor.',
    })
    expect(screen.getByRole('alert')).toHaveTextContent(
      'No pudimos comunicarnos con el servidor.',
    )
  })

  it('renders the unavailable state when dashboard is null and there is no error', () => {
    renderContent({ dashboard: null })
    expect(screen.getByText('No encontramos el evento solicitado.')).toBeInTheDocument()
  })
})

describe('EventDashboardContent — SGEB-0004 partial success', () => {
  it('shows a "datos parciales" banner only when partial is true', () => {
    renderContent({ dashboard: { ...FULL_DASHBOARD, partial: true } })
    expect(screen.getByText('Datos parciales')).toBeInTheDocument()
  })

  it('does not show the partial banner on a full success', () => {
    renderContent()
    expect(screen.queryByText('Datos parciales')).not.toBeInTheDocument()
  })

  it('renders a failed section as "No disponible" without blanking the rest of the dashboard', () => {
    renderContent({
      dashboard: { ...FULL_DASHBOARD, partial: true, barra: null, alertas: null },
    })

    // The two failed sections render an honest unavailable message...
    expect(screen.getAllByText('No disponible por el momento.')).toHaveLength(2)
    // ...while a succeeded section still shows its real data, never a fake zero.
    expect(screen.getByText('4.5 / 5')).toBeInTheDocument()
  })

  it('never substitutes a fake zero for a failed section', () => {
    renderContent({ dashboard: { ...FULL_DASHBOARD, partial: true, resumen: null } })

    expect(screen.queryByText('0 / 10')).not.toBeInTheDocument()
    expect(screen.getByText('No disponible por el momento.')).toBeInTheDocument()
  })
})

describe('EventDashboardContent — deep links', () => {
  it('links the Servicio section to the Solicitudes screen', () => {
    renderContent()
    expect(screen.getByRole('link', { name: 'Ver solicitudes' })).toHaveAttribute(
      'href',
      '/eventos/1001/solicitudes',
    )
  })

  it('links the Asistencia section to the attendance screen', () => {
    renderContent()
    expect(screen.getByRole('link', { name: 'Ver pase de lista' })).toHaveAttribute(
      'href',
      '/eventos/1001/pase-de-lista',
    )
  })
})
