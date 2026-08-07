import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { TeamSelectionPage } from '@/features/events/team-selection/pages/TeamSelectionPage'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/eventos/:id/equipo" element={<TeamSelectionPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('TeamSelectionPage', () => {
  it('renders the populated roster for a known event id, clearly labeled as development data', () => {
    renderAt('/eventos/1001/equipo')

    expect(
      screen.getByRole('heading', { level: 2, name: 'Selección de equipo' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/datos de desarrollo/)).toBeInTheDocument()
    expect(screen.getByText('Mesero de demostración uno')).toBeInTheDocument()
  })

  it('renders the unavailable state for a malformed event id', () => {
    renderAt('/eventos/not-a-number/equipo')

    expect(screen.getByText('No encontramos el evento solicitado.')).toBeInTheDocument()
  })

  it('renders the unavailable state for a well-formed id with no matching event', () => {
    renderAt('/eventos/999999/equipo')

    expect(screen.getByText('No encontramos el evento solicitado.')).toBeInTheDocument()
  })

  it('selecting a candidate moves them from candidates to selected, end to end, with no persistence claim', async () => {
    const user = userEvent.setup()
    renderAt('/eventos/1001/equipo')

    const button = screen.getByRole('button', {
      name: 'Seleccionar a Mesero de demostración uno',
    })
    await user.click(button)

    await waitFor(() => {
      expect(
        screen.queryByRole('button', {
          name: 'Seleccionar a Mesero de demostración uno',
        }),
      ).not.toBeInTheDocument()
    })

    // Now appears in the selected section instead, with no reverse action.
    expect(screen.getAllByText('Mesero de demostración uno').length).toBeGreaterThan(0)
    expect(
      screen.queryByRole('button', { name: /Deseleccionar/ }),
    ).not.toBeInTheDocument()
  })

  it('a repeated click on the same candidate while selecting only invokes one transition', async () => {
    const user = userEvent.setup()
    renderAt('/eventos/1001/equipo')

    const button = screen.getByRole('button', {
      name: 'Seleccionar a Mesero de demostración dos',
    })
    await user.click(button)
    // The button becomes disabled synchronously (React batches the
    // `selecting` state update before the microtask yield resolves), so a
    // second click physically cannot register on a disabled button.
    expect(button).toBeDisabled()

    await waitFor(() => {
      expect(
        screen.queryByRole('button', {
          name: 'Seleccionar a Mesero de demostración dos',
        }),
      ).not.toBeInTheDocument()
    })

    expect(screen.getAllByText('Mesero de demostración dos').length).toBe(1)
  })
})
