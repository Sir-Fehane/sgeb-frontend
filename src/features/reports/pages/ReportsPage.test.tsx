import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { WAITER_PERFORMANCE_REPORT_FIXTURE } from '@/features/reports/fixtures/reportFixtures'
import { ReportsPage } from '@/features/reports/pages/ReportsPage'

describe('ReportsPage', () => {
  it('shows the populated fixture table by default, clearly labeled as development data', () => {
    render(<ReportsPage />)

    const first = WAITER_PERFORMANCE_REPORT_FIXTURE[0]
    if (!first) {
      throw new Error('Expected at least one fixture item')
    }
    expect(screen.getByText(first.nombreCompleto)).toBeInTheDocument()
    expect(screen.getByText(/datos de desarrollo/)).toBeInTheDocument()
  })

  it('does not expose a development-state selector', () => {
    render(<ReportsPage />)

    expect(screen.queryByLabelText('Vista de desarrollo')).not.toBeInTheDocument()
  })

  it('renders rows as static content — no links or buttons in the table', () => {
    render(<ReportsPage />)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('re-sorts the visible development rows when orden changes', async () => {
    const user = userEvent.setup()
    render(<ReportsPage />)

    // Default orden=calificacion: Ana (4.8) leads.
    const rowsBefore = screen.getAllByRole('row')
    expect(rowsBefore[1]).toHaveTextContent('Ana Torres')

    await user.selectOptions(screen.getByLabelText('Ordenar por'), 'asistencias')

    // orden=asistencias: Carla (14 confirmadas) leads.
    const rowsAfter = screen.getAllByRole('row')
    expect(rowsAfter[1]).toHaveTextContent('Carla Núñez')
  })

  it('never claims a specific server default for the date range', () => {
    render(<ReportsPage />)

    // The fixture range is fixed/fictional, not derived from "today".
    expect(screen.getByLabelText('Desde')).toHaveValue('2026-07-01')
    expect(screen.getByLabelText('Hasta')).toHaveValue('2026-07-31')
  })
})
