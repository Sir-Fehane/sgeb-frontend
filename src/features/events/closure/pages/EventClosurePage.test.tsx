import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { EventClosurePage } from '@/features/events/closure/pages/EventClosurePage'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/eventos/:id/cierre" element={<EventClosurePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('EventClosurePage', () => {
  it('renders the populated closure content for a known event id, clearly labeled as development data', () => {
    renderAt('/eventos/1001/cierre')

    expect(
      screen.getByRole('heading', { level: 2, name: 'Cierre del evento' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/datos de desarrollo/)).toBeInTheDocument()
    expect(screen.getByText('Estado del cierre')).toBeInTheDocument()
  })

  it('states plainly that submitting a merma report here sends no request, and that payment calculation happens elsewhere', () => {
    renderAt('/eventos/1001/cierre')

    expect(
      screen.getByText(/no envía ninguna solicitud ni se conserva al recargar la página/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/El cálculo de pagos no se realiza desde este panel/),
    ).toBeInTheDocument()
  })

  it('renders the unavailable state for a malformed event id', () => {
    renderAt('/eventos/not-a-number/cierre')

    expect(screen.getByText('No encontramos el evento solicitado.')).toBeInTheDocument()
  })

  it('renders the unavailable state for a well-formed id with no matching event', () => {
    renderAt('/eventos/999999/cierre')

    expect(screen.getByText('No encontramos el evento solicitado.')).toBeInTheDocument()
  })

  it('event 1001 shows the blocked-readiness fixture — not finalized, real blockers', () => {
    renderAt('/eventos/1001/cierre')

    expect(screen.getByText('Evento pendiente de finalizar')).toBeInTheDocument()
    expect(screen.getByText('No listo para calcular pagos')).toBeInTheDocument()
  })

  it('event 2001 shows the in-progress fixture — not finalized, but no other blockers, and zero existing merma reports', () => {
    renderAt('/eventos/2001/cierre')

    expect(screen.getByText('Evento pendiente de finalizar')).toBeInTheDocument()
    expect(screen.getByText('No listo para calcular pagos')).toBeInTheDocument()
    expect(
      screen.getByText('Aún no se han registrado reportes de merma para este evento.'),
    ).toBeInTheDocument()
  })

  it('event 3001 shows the ready-readiness fixture, consistent with its own shared estado of finalizado', () => {
    renderAt('/eventos/3001/cierre')

    expect(screen.getByText('Completado')).toBeInTheDocument()
    expect(screen.getByText('Listo para calcular pagos')).toBeInTheDocument()
  })

  it('submitting the merma form appends a new local report to the existing-reports list, end to end', async () => {
    const user = userEvent.setup()
    renderAt('/eventos/2001/cierre')

    expect(
      screen.getByText('Aún no se han registrado reportes de merma para este evento.'),
    ).toBeInTheDocument()

    await user.selectOptions(
      screen.getByRole('combobox', { name: /Tipo de artículo 1/ }),
      'vaso_roto',
    )
    const cantidad = screen.getByRole('spinbutton', { name: /Cantidad 1/ })
    await user.clear(cantidad)
    await user.type(cantidad, '3')
    await user.click(screen.getByRole('button', { name: 'Registrar reporte de merma' }))

    expect(await screen.findByText('Reporte registrado localmente.')).toBeInTheDocument()
    expect(
      screen.queryByText('Aún no se han registrado reportes de merma para este evento.'),
    ).not.toBeInTheDocument()

    const reportsSection = screen
      .getByRole('list', { name: 'Reportes de merma registrados' })
      .closest('section')!
    expect(within(reportsSection).getByText(/Vaso roto/)).toBeInTheDocument()
    expect(within(reportsSection).getByText(/cantidad 3/)).toBeInTheDocument()
  })

  it('never exposes a payment-calculation action anywhere on this page', () => {
    renderAt('/eventos/2001/cierre')

    expect(
      screen.queryByRole('button', { name: /Calcular pagos/i }),
    ).not.toBeInTheDocument()
  })

  it('never exposes a payment-calculation action even when the event is ready (listo=true)', () => {
    renderAt('/eventos/3001/cierre')

    expect(
      screen.queryByRole('button', { name: /Calcular pagos/i }),
    ).not.toBeInTheDocument()
  })
})
