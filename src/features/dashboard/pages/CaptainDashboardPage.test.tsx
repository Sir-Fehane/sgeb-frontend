import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { CaptainDashboardPage } from '@/features/dashboard/pages/CaptainDashboardPage'

describe('CaptainDashboardPage', () => {
  it('shows the populated fixture dashboard by default, clearly labeled as development data', () => {
    render(<CaptainDashboardPage />)

    expect(screen.getByText('Resumen de eventos')).toBeInTheDocument()
    expect(screen.getByText(/datos de desarrollo/)).toBeInTheDocument()
  })

  it('does not expose a development-state selector', () => {
    render(<CaptainDashboardPage />)

    expect(screen.queryByLabelText('Vista de desarrollo')).not.toBeInTheDocument()
  })

  it('renders upcoming-event rows as static items — no event-detail route is approved', () => {
    render(<CaptainDashboardPage />)

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('renders "Invitar meseros" genuinely disabled and never claims an invitation happened', async () => {
    const user = userEvent.setup()
    render(<CaptainDashboardPage />)

    const button = screen.getByRole('button', { name: 'Invitar meseros' })
    expect(button).toBeDisabled()

    await user.click(button)

    expect(screen.queryByText(/invitación.*enviada|éxito/i)).not.toBeInTheDocument()
    expect(button).toBeDisabled()
  })

  it('allows changing the date-range filters', async () => {
    const user = userEvent.setup()
    render(<CaptainDashboardPage />)

    const desde = screen.getByLabelText('Desde')
    await user.clear(desde)
    await user.type(desde, '2026-01-01')

    expect(desde).toHaveValue('2026-01-01')
  })
})
