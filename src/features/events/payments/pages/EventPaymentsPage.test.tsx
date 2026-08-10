import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { EventPaymentsPage } from '@/features/events/payments/pages/EventPaymentsPage'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/eventos/:id/pagos" element={<EventPaymentsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('EventPaymentsPage', () => {
  it('renders the populated payments content for a known event id, clearly labeled as development data', () => {
    renderAt('/eventos/3001/pagos')

    expect(screen.getByRole('heading', { level: 2, name: 'Pagos' })).toBeInTheDocument()
    expect(screen.getByText(/datos de desarrollo/)).toBeInTheDocument()
  })

  it('states plainly that this panel sends no request and never connects to a bank', () => {
    renderAt('/eventos/3001/pagos')

    expect(
      screen.getByText(
        /no envía ninguna solicitud, no conecta con ningún banco y no se conserva al recargar/,
      ),
    ).toBeInTheDocument()
  })

  it('renders the unavailable state for a malformed event id', () => {
    renderAt('/eventos/not-a-number/pagos')

    expect(screen.getByText('No encontramos el evento solicitado.')).toBeInTheDocument()
  })

  it('renders the unavailable state for a well-formed id with no matching event', () => {
    renderAt('/eventos/999999/pagos')

    expect(screen.getByText('No encontramos el evento solicitado.')).toBeInTheDocument()
  })

  it('event 1001 (closure blocked) makes payment calculation unavailable', () => {
    renderAt('/eventos/1001/pagos')

    expect(
      screen.getByText('No se pueden calcular los pagos todavía.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Calcular pagos/i }),
    ).not.toBeInTheDocument()
  })

  it('event 2001 (closure blocked) makes payment calculation unavailable', () => {
    renderAt('/eventos/2001/pagos')

    expect(
      screen.getByText('No se pueden calcular los pagos todavía.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Calcular pagos/i }),
    ).not.toBeInTheDocument()
  })

  it('event 3001 (closure ready) shows the pre-seeded mixed-state payments', () => {
    renderAt('/eventos/3001/pagos')

    expect(screen.getByText('Mesero de demostración catorce')).toBeInTheDocument()
    expect(screen.getByText('Mesero de demostración quince')).toBeInTheDocument()
    expect(screen.getByText('Mesero de demostración dieciséis')).toBeInTheDocument()
    expect(screen.getByText('Mesero de demostración diecisiete')).toBeInTheDocument()
  })

  it('recalculating preserves the already-paid row through the callback result, end to end', async () => {
    const user = userEvent.setup()
    renderAt('/eventos/3001/pagos')

    const pagadoRowBefore = screen
      .getByText('Mesero de demostración quince')
      .closest('tr')
    expect(pagadoRowBefore).toHaveTextContent('REF-000456')

    await user.click(screen.getByRole('button', { name: 'Recalcular pagos' }))

    const pagadoRowAfter = screen.getByText('Mesero de demostración quince').closest('tr')
    expect(pagadoRowAfter).toHaveTextContent('Pagado')
    expect(pagadoRowAfter).toHaveTextContent('REF-000456')
  })

  it('recalculating refreshes the fallido row back to pendiente', async () => {
    const user = userEvent.setup()
    renderAt('/eventos/3001/pagos')

    await user.click(screen.getByRole('button', { name: 'Recalcular pagos' }))

    const row = screen.getByText('Mesero de demostración dieciséis').closest('tr')
    expect(row).toHaveTextContent('Pendiente')
    expect(row).not.toHaveTextContent('Fallido')
  })

  it('marking a pending payment as paid updates its row end to end, with an uppercase-normalized reference', async () => {
    const user = userEvent.setup()
    renderAt('/eventos/3001/pagos')

    await user.click(
      screen.getByRole('button', {
        name: 'Registrar transferencia realizada de Mesero de demostración catorce',
      }),
    )
    await user.type(screen.getByLabelText(/Referencia bancaria/), 'nueva-ref-1')
    await user.click(screen.getByRole('button', { name: 'Registrar transferencia' }))

    const row = await screen.findByText('Mesero de demostración catorce')
    const tr = row.closest('tr') as HTMLElement
    expect(within(tr).getByText('Pagado')).toBeInTheDocument()
    expect(tr).toHaveTextContent('NUEVA-REF-1')
  })

  it('marking a pending payment as failed updates its row end to end, without persisting the motivo text', async () => {
    const user = userEvent.setup()
    renderAt('/eventos/3001/pagos')

    await user.click(
      screen.getByRole('button', {
        name: 'Registrar transferencia realizada de Mesero de demostración catorce',
      }),
    )
    // Switch to the failed-registration action instead of submitting paid.
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await user.click(
      screen.getByRole('button', {
        name: 'Registrar transferencia rechazada de Mesero de demostración catorce',
      }),
    )
    await user.type(screen.getByLabelText(/Motivo/), 'Cuenta bancaria cerrada')
    await user.click(
      screen.getByRole('button', { name: 'Registrar transferencia rechazada' }),
    )

    const row = await screen.findByText('Mesero de demostración catorce')
    const tr = row.closest('tr') as HTMLElement
    expect(within(tr).getByText('Fallido')).toBeInTheDocument()
    expect(tr).not.toHaveTextContent('Cuenta bancaria cerrada')
  })

  it('a payment marked paid locally survives a subsequent recalculation without regressing to pendiente', async () => {
    const user = userEvent.setup()
    renderAt('/eventos/3001/pagos')

    await user.click(
      screen.getByRole('button', {
        name: 'Registrar transferencia realizada de Mesero de demostración catorce',
      }),
    )
    await user.type(screen.getByLabelText(/Referencia bancaria/), 'local-ref-9')
    await user.click(screen.getByRole('button', { name: 'Registrar transferencia' }))

    const rowAfterMarking = (
      await screen.findByText('Mesero de demostración catorce')
    ).closest('tr') as HTMLElement
    expect(within(rowAfterMarking).getByText('Pagado')).toBeInTheDocument()
    expect(rowAfterMarking).toHaveTextContent('LOCAL-REF-9')

    await user.click(screen.getByRole('button', { name: 'Recalcular pagos' }))

    const rowAfterRecalculation = screen
      .getByText('Mesero de demostración catorce')
      .closest('tr') as HTMLElement
    // Still pagado, reference intact, no action controls (still terminal).
    expect(within(rowAfterRecalculation).getByText('Pagado')).toBeInTheDocument()
    expect(rowAfterRecalculation).toHaveTextContent('LOCAL-REF-9')
    expect(within(rowAfterRecalculation).queryByRole('button')).not.toBeInTheDocument()

    // A different, non-paid row still follows the authored calculation
    // result (fallido -> pendiente), proving this isn't a blanket freeze
    // of the whole list.
    const otherRow = screen
      .getByText('Mesero de demostración dieciséis')
      .closest('tr') as HTMLElement
    expect(within(otherRow).getByText('Pendiente')).toBeInTheDocument()
  })

  it('never exposes a bulk approval action or the retired endpoint anywhere on this page', () => {
    renderAt('/eventos/3001/pagos')

    expect(screen.queryByText('pagos/aprobar')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Aprobar todos/i }),
    ).not.toBeInTheDocument()
  })
})
