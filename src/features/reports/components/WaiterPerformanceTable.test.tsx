import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { WaiterPerformanceTable } from '@/features/reports/components/WaiterPerformanceTable'
import type { WaiterPerformanceRowViewModel } from '@/features/reports/types/report'

const ROW: WaiterPerformanceRowViewModel = {
  uuidUsuario: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  nombreCompleto: 'Juan Pérez',
  eventosTrabajados: 4,
  asistencias: 3,
  faltas: 1,
  pagosAcumulados: 1200,
  pagosRecibidos: 900,
  porCobrar: 300,
  calificacionesRecibidas: 3,
  promedioCalificacion: 4.5,
  calificacionesBajas: 0,
  solicitudesAtendidas: 10,
  segundosRespuestaPromedio: 90,
}

describe('WaiterPerformanceTable', () => {
  it('renders one row per mesero with formatted money, rating, and response time', () => {
    render(<WaiterPerformanceTable rows={[ROW]} />)

    expect(screen.getByRole('rowheader', { name: 'Juan Pérez' })).toBeInTheDocument()
    expect(screen.getByText('4.5 / 5')).toBeInTheDocument()
    expect(screen.getByText('1 min 30 s')).toBeInTheDocument()
    expect(screen.getByText(/1,200\.00/)).toBeInTheDocument()
    expect(screen.getByText(/900\.00/)).toBeInTheDocument()
    expect(screen.getByText(/300\.00/)).toBeInTheDocument()
  })

  it('renders a null average rating as "Sin calificaciones", never as a numeric zero', () => {
    render(<WaiterPerformanceTable rows={[{ ...ROW, promedioCalificacion: null }]} />)

    expect(screen.getByText('Sin calificaciones')).toBeInTheDocument()
    expect(screen.queryByText('0.0 / 5')).not.toBeInTheDocument()
  })

  it('renders a null response time as "Sin datos", never as "0 s"', () => {
    render(
      <WaiterPerformanceTable rows={[{ ...ROW, segundosRespuestaPromedio: null }]} />,
    )

    expect(screen.getByText('Sin datos')).toBeInTheDocument()
    expect(screen.queryByText('0 s')).not.toBeInTheDocument()
  })

  it('never renders a "puntualidad" column — the backend field always carries no information', () => {
    render(<WaiterPerformanceTable rows={[ROW]} />)

    expect(screen.queryByText(/puntualidad/i)).not.toBeInTheDocument()
  })

  it('groups columns into Asistencia/Servicio/Calidad/Pagos headers', () => {
    render(<WaiterPerformanceTable rows={[ROW]} />)

    expect(screen.getByRole('columnheader', { name: 'Asistencia' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Servicio' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Calidad' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Pagos' })).toBeInTheDocument()
  })
})
