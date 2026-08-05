import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { StaffingRiskSection } from '@/features/dashboard/components/StaffingRiskSection'
import type { StaffingRiskViewModel } from '@/features/dashboard/types/dashboard'

const RISK: StaffingRiskViewModel = {
  idEvento: 'dashboard-evento-demo-1',
  titulo: 'Evento de demostración — boda',
  horasParaInicio: 18.5,
  faltantes: 2,
}

describe('StaffingRiskSection', () => {
  it('renders "No disponible" when staffingRiesgo is null', () => {
    render(<StaffingRiskSection staffingRiesgo={null} />)

    expect(screen.getByText('No disponible.')).toBeInTheDocument()
  })

  it('renders a no-risk message when staffingRiesgo is an empty array', () => {
    render(<StaffingRiskSection staffingRiesgo={[]} />)

    expect(screen.getByText('No hay eventos con riesgo de personal.')).toBeInTheDocument()
  })

  it('renders populated risk fields (never as a button/link — no per-event action is documented)', () => {
    render(<StaffingRiskSection staffingRiesgo={[RISK]} />)

    expect(screen.getByText(RISK.titulo)).toBeInTheDocument()
    expect(screen.getByText('18.5')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('renders "Invitar meseros" genuinely disabled with a pending explanation when onInviteWaiters is not supplied', async () => {
    const user = userEvent.setup()
    render(<StaffingRiskSection staffingRiesgo={[RISK]} />)

    const button = screen.getByRole('button', { name: 'Invitar meseros' })
    expect(button).toBeDisabled()
    expect(
      screen.getByText(/invitación de meseros desde el panel todavía no está definida/),
    ).toBeInTheDocument()

    await user.click(button)
    expect(button).toBeDisabled()
  })

  it('enables "Invitar meseros" and invokes the callback when onInviteWaiters is supplied', async () => {
    const user = userEvent.setup()
    const onInviteWaiters = vi.fn()
    render(
      <StaffingRiskSection staffingRiesgo={[RISK]} onInviteWaiters={onInviteWaiters} />,
    )

    const button = screen.getByRole('button', { name: 'Invitar meseros' })
    expect(button).toBeEnabled()

    await user.click(button)
    expect(onInviteWaiters).toHaveBeenCalledOnce()
  })

  it('still shows the invite action even when there is no risk (empty array), since it is a section-level control', () => {
    render(<StaffingRiskSection staffingRiesgo={[]} />)

    expect(screen.getByRole('button', { name: 'Invitar meseros' })).toBeInTheDocument()
  })
})
