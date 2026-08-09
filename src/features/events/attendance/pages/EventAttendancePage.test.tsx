import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { EventAttendancePage } from '@/features/events/attendance/pages/EventAttendancePage'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/eventos/:id/pase-de-lista" element={<EventAttendancePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('EventAttendancePage', () => {
  it('renders the populated roster for a known event id, clearly labeled as development data', () => {
    renderAt('/eventos/1001/pase-de-lista')

    expect(
      screen.getByRole('heading', { level: 2, name: 'Pase de lista' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/datos de desarrollo/)).toBeInTheDocument()
    expect(screen.getByText('Mesero de demostración tres')).toBeInTheDocument()
  })

  it('states plainly that confirmation happens on the mesero device, never this panel', () => {
    renderAt('/eventos/1001/pase-de-lista')

    // Both the dev-data banner and the page header make this claim —
    // intentionally redundant, safety-relevant wording, not a collision.
    const matches = screen.getAllByText(
      /confirmación de asistencia y llegada se realiza desde el dispositivo/,
    )
    expect(matches.length).toBeGreaterThanOrEqual(2)
  })

  it('renders the unavailable state for a malformed event id', () => {
    renderAt('/eventos/not-a-number/pase-de-lista')

    expect(screen.getByText('No encontramos el evento solicitado.')).toBeInTheDocument()
  })

  it('renders the unavailable state for a well-formed id with no matching event', () => {
    renderAt('/eventos/999999/pase-de-lista')

    expect(screen.getByText('No encontramos el evento solicitado.')).toBeInTheDocument()
  })

  it('renders "no selected participants" for an event with a matching detail fixture but no roster', () => {
    renderAt('/eventos/2001/pase-de-lista')

    expect(
      screen.getByText('Aún no hay meseros seleccionados para este evento.'),
    ).toBeInTheDocument()
  })

  it('never calls any confirmacion-llegada action and exposes no geolocation/biometric API usage', () => {
    const geolocationSpy = vi.fn()
    const originalGeolocation = navigator.geolocation
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition: geolocationSpy },
      configurable: true,
    })

    renderAt('/eventos/1001/pase-de-lista')

    expect(geolocationSpy).not.toHaveBeenCalled()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()

    Object.defineProperty(navigator, 'geolocation', {
      value: originalGeolocation,
      configurable: true,
    })
  })
})
