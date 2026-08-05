import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { WAITERS_FIXTURE } from '@/features/waiters/fixtures/waiterFixtures'
import { WaitersPage } from '@/features/waiters/pages/WaitersPage'

function renderPage() {
  return render(
    <MemoryRouter>
      <WaitersPage />
    </MemoryRouter>,
  )
}

describe('WaitersPage', () => {
  it('shows the populated list by default, clearly labeled as development data', () => {
    renderPage()

    const first = WAITERS_FIXTURE[0]
    if (!first) {
      throw new Error('Expected at least one fixture waiter')
    }
    expect(screen.getByText(first.nombreCompleto)).toBeInTheDocument()
    expect(screen.getByText(/datos de desarrollo/)).toBeInTheDocument()
  })

  it('does not expose a development-state selector', () => {
    renderPage()

    expect(screen.queryByLabelText('Vista de desarrollo')).not.toBeInTheDocument()
  })

  it('renders waiter rows as static items — no selection action is approved, so no row is a button or link', () => {
    renderPage()

    const first = WAITERS_FIXTURE[0]
    if (!first) {
      throw new Error('Expected at least one fixture waiter')
    }
    expect(screen.getByText(first.nombreCompleto)).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    // Only the (disabled) invite action and "Limpiar filtros" are
    // buttons — no waiter row is exposed as one.
    const buttonNames = screen.getAllByRole('button').map((button) => button.textContent)
    expect(buttonNames).toEqual(['Invitar mesero', 'Limpiar filtros'])
  })

  it('renders "Invitar mesero" genuinely disabled, with a pending explanation, and never claims an invitation happened', async () => {
    const user = userEvent.setup()
    renderPage()

    const button = screen.getByRole('button', { name: 'Invitar mesero' })
    expect(button).toBeDisabled()
    expect(
      screen.getByText(/campos de la invitación y el mapeo de rol/),
    ).toBeInTheDocument()

    await user.click(button)

    expect(screen.queryByText(/invitación.*enviada|éxito/i)).not.toBeInTheDocument()
    expect(button).toBeDisabled()
  })

  it('applies filters to the visible list', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(screen.getByLabelText('Estado de cuenta'), 'inactivo')

    const activo = WAITERS_FIXTURE.find((waiter) => waiter.estadoCuenta === 'activo')
    const inactivo = WAITERS_FIXTURE.find((waiter) => waiter.estadoCuenta === 'inactivo')
    if (!activo || !inactivo) {
      throw new Error('Expected both an activo and an inactivo fixture waiter')
    }

    expect(screen.getByText(inactivo.nombreCompleto)).toBeInTheDocument()
    expect(screen.queryByText(activo.nombreCompleto)).not.toBeInTheDocument()
  })
})
