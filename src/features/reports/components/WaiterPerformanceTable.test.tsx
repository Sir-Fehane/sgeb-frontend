import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { WaiterPerformanceTable } from '@/features/reports/components/WaiterPerformanceTable'
import { WAITER_PERFORMANCE_REPORT_FIXTURE } from '@/features/reports/fixtures/reportFixtures'

function rowFor(name: string): HTMLElement {
  const row = screen.getByText(name).closest('tr')
  if (!row) {
    throw new Error(`Expected to find a row for ${name}`)
  }
  return row
}

describe('WaiterPerformanceTable', () => {
  it('renders every documented presentation field for each row', () => {
    render(<WaiterPerformanceTable items={WAITER_PERFORMANCE_REPORT_FIXTURE} />)

    const ana = WAITER_PERFORMANCE_REPORT_FIXTURE[0]
    if (!ana) {
      throw new Error('Expected at least one fixture item')
    }
    const cells = within(rowFor(ana.nombreCompleto)).getAllByRole('cell')

    expect(cells[1]).toHaveTextContent(String(ana.eventosApartados))
    expect(cells[2]).toHaveTextContent(String(ana.asistenciasConfirmadas))
    expect(cells[2]).toHaveTextContent(`${String(ana.porcentajeAsistencia)}%`)
    expect(cells[3]).toHaveTextContent('4.8 / 5')
    expect(cells[5]).toHaveTextContent('Vigente')
  })

  it('never renders uuidUsuario anywhere', () => {
    render(<WaiterPerformanceTable items={WAITER_PERFORMANCE_REPORT_FIXTURE} />)

    for (const item of WAITER_PERFORMANCE_REPORT_FIXTURE) {
      expect(screen.queryByText(item.uuidUsuario)).not.toBeInTheDocument()
    }
  })

  it('never renders a CLABE number, only readable status text', () => {
    render(<WaiterPerformanceTable items={WAITER_PERFORMANCE_REPORT_FIXTURE} />)

    expect(screen.getAllByText('Vigente').length).toBeGreaterThan(0)
    expect(screen.getAllByText('No vigente').length).toBeGreaterThan(0)
    expect(screen.queryByText(/\d{18}/)).not.toBeInTheDocument()
  })

  it('renders rows as static table rows — never links or buttons', () => {
    render(<WaiterPerformanceTable items={WAITER_PERFORMANCE_REPORT_FIXTURE} />)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders the percentage as plain text, not color-only', () => {
    render(<WaiterPerformanceTable items={WAITER_PERFORMANCE_REPORT_FIXTURE} />)

    const bruno = within(rowFor('Bruno Salas')).getAllByRole('cell')
    expect(bruno[2]).toHaveTextContent('70%')

    // Two fixture waiters (Ana, Diego) both have 100% attendance.
    const ana = within(rowFor('Ana Torres')).getAllByRole('cell')
    const diego = within(rowFor('Diego Ramírez')).getAllByRole('cell')
    expect(ana[2]).toHaveTextContent('100%')
    expect(diego[2]).toHaveTextContent('100%')
  })

  it('renders "Sin calificaciones" for a null calificacionPromedio, and its ratings count separately', () => {
    render(<WaiterPerformanceTable items={WAITER_PERFORMANCE_REPORT_FIXTURE} />)

    const cells = within(rowFor('Bruno Salas')).getAllByRole('cell')
    expect(cells[3]).toHaveTextContent('Sin calificaciones')
    expect(cells[3]).toHaveTextContent('0')
  })

  it('formats montoPagado and montoPendiente as MXN', () => {
    render(<WaiterPerformanceTable items={WAITER_PERFORMANCE_REPORT_FIXTURE} />)

    expect(screen.getByText(/\$6,000\.00/)).toBeInTheDocument()
    expect(screen.getByText(/\$800\.00/)).toBeInTheDocument()
  })

  it('renders a semantic table with column headers', () => {
    render(<WaiterPerformanceTable items={WAITER_PERFORMANCE_REPORT_FIXTURE} />)

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Mesero' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Cuenta' })).toBeInTheDocument()
  })
})
