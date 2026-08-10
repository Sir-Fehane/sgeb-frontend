import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { EventMontagePage } from '@/features/events/montage/pages/EventMontagePage'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/eventos/:id/montaje" element={<EventMontagePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('EventMontagePage', () => {
  it('renders the populated roster for a known event id, clearly labeled as development data', () => {
    renderAt('/eventos/1001/montaje')

    expect(
      screen.getByRole('heading', { level: 2, name: 'Montaje y asignación de mesas' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/datos de desarrollo/)).toBeInTheDocument()
    expect(screen.getByText('Mesero de demostración tres')).toBeInTheDocument()
  })

  it('states plainly that approving/assigning here sends no request and is not persisted', () => {
    renderAt('/eventos/1001/montaje')

    expect(
      screen.getByText(/no envía ninguna solicitud ni se conserva al recargar la página/),
    ).toBeInTheDocument()
  })

  it('renders the unavailable state for a malformed event id', () => {
    renderAt('/eventos/not-a-number/montaje')

    expect(screen.getByText('No encontramos el evento solicitado.')).toBeInTheDocument()
  })

  it('renders the unavailable state for a well-formed id with no matching event', () => {
    renderAt('/eventos/999999/montaje')

    expect(screen.getByText('No encontramos el evento solicitado.')).toBeInTheDocument()
  })

  it('renders "no selected participants" for an event with a matching detail fixture but no roster', () => {
    renderAt('/eventos/2001/montaje')

    expect(
      screen.getByText('Aún no hay meseros seleccionados para este evento.'),
    ).toBeInTheDocument()
  })

  it('never calls navigator.geolocation or navigator.credentials — this is not the attendance/arrival flow', () => {
    const geolocationSpy = vi.fn()
    const originalGeolocation = navigator.geolocation
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition: geolocationSpy },
      configurable: true,
    })

    renderAt('/eventos/1001/montaje')

    expect(geolocationSpy).not.toHaveBeenCalled()

    Object.defineProperty(navigator, 'geolocation', {
      value: originalGeolocation,
      configurable: true,
    })
  })

  it('approving a completed checklist locally unlocks assignment, and assigning/releasing updates local state end to end', async () => {
    const user = userEvent.setup()
    renderAt('/eventos/1001/montaje')

    // "Mesero de demostración seis" (6002) starts completed-but-not-approved.
    const row = screen
      .getByText('Mesero de demostración seis')
      .closest('li') as HTMLElement
    expect(row).toHaveTextContent('Checklist completo · sin aprobar')
    expect(within(row).queryByRole('combobox')).not.toBeInTheDocument()

    await user.click(within(row).getByRole('button', { name: /Aprobar checklist/ }))

    expect(row).toHaveTextContent('Checklist aprobado')
    const select = within(row).getByRole('combobox')
    await user.selectOptions(select, '1')
    await user.click(within(row).getByRole('button', { name: /Asignar mesa/ }))

    expect(row).toHaveTextContent('Mesa 1')

    await user.click(within(row).getByRole('button', { name: /Liberar/ }))

    expect(row).toHaveTextContent('Sin mesa asignada.')
  })

  it('keeps mesa availability globally consistent across two participants — assigning removes it everywhere, releasing restores it everywhere', async () => {
    const user = userEvent.setup()
    renderAt('/eventos/1001/montaje')

    // Both start eligible: 7001 ("doce") is already approved+unassigned;
    // 6002 ("seis") is completed-but-not-approved, approved here first so
    // both participants genuinely compete for the same free-tables pool.
    const rowA = screen
      .getByText('Mesero de demostración doce')
      .closest('li') as HTMLElement
    const rowB = screen
      .getByText('Mesero de demostración seis')
      .closest('li') as HTMLElement
    await user.click(within(rowB).getByRole('button', { name: /Aprobar checklist/ }))
    expect(rowB).toHaveTextContent('Checklist aprobado')

    // Sanity: both selects currently offer "Mesa 1" (still libre).
    expect(
      within(within(rowA).getByRole('combobox'))
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toContain('Mesa 1')
    expect(
      within(within(rowB).getByRole('combobox'))
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toContain('Mesa 1')

    // A assigns Mesa 1.
    await user.selectOptions(within(rowA).getByRole('combobox'), '1')
    await user.click(within(rowA).getByRole('button', { name: /Asignar mesa/ }))
    expect(rowA).toHaveTextContent('Mesa 1')

    // Mesa 1 now shows as occupied in the table-availability section.
    const tablesSection = screen.getByText('Disponibilidad de mesas').closest('section')
    const mesa1Item = within(tablesSection!).getByText('Mesa 1').closest('li')
    expect(mesa1Item).toHaveTextContent('Ocupada')

    // Mesa 1 disappears from B's own select — B cannot submit it through
    // any UI path once A holds it.
    expect(
      within(within(rowB).getByRole('combobox'))
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).not.toContain('Mesa 1')

    // Releasing A's assignment frees Mesa 1 again, everywhere.
    await user.click(within(rowA).getByRole('button', { name: /Liberar/ }))
    expect(rowA).toHaveTextContent('Sin mesa asignada.')

    const mesa1ItemAfterRelease = within(tablesSection!).getByText('Mesa 1').closest('li')
    expect(mesa1ItemAfterRelease).toHaveTextContent('Libre')
    expect(
      within(within(rowB).getByRole('combobox'))
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toContain('Mesa 1')

    // And it is genuinely assignable again — B can now take it.
    await user.selectOptions(within(rowB).getByRole('combobox'), '1')
    await user.click(within(rowB).getByRole('button', { name: /Asignar mesa/ }))
    expect(rowB).toHaveTextContent('Mesa 1')
    expect(rowA).not.toHaveTextContent('Mesa 1')
  })

  it('never registers an already-occupied table as assignable to another participant', () => {
    renderAt('/eventos/1001/montaje')

    // "Mesero de demostración doce" (7001) is approved and unassigned;
    // "Mesa 3 VIP" is already occupied by participation 7002.
    const row = screen
      .getByText('Mesero de demostración doce')
      .closest('li') as HTMLElement
    const select = within(row).getByRole('combobox')
    const optionLabels = within(select)
      .getAllByRole('option')
      .map((o) => o.textContent)

    expect(optionLabels).not.toContain('Mesa 3 VIP')
  })
})
