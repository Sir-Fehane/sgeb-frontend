import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { WaitersPageHeader } from '@/features/waiters/components/WaitersPageHeader'

describe('WaitersPageHeader', () => {
  it('renders the invite action disabled, with a clear accessible name and a readable pending explanation, when no onInvite is supplied', () => {
    render(<WaitersPageHeader />)

    const button = screen.getByRole('button', { name: 'Invitar mesero' })
    expect(button).toBeDisabled()
    expect(
      screen.getByText(/campos de la invitación y el mapeo de rol/),
    ).toBeInTheDocument()
  })

  it('does not invoke any callback when the disabled invite button is clicked', async () => {
    const user = userEvent.setup()
    render(<WaitersPageHeader />)

    const button = screen.getByRole('button', { name: 'Invitar mesero' })
    await user.click(button)

    expect(button).toBeDisabled()
  })

  it('enables the invite action and invokes the callback once a real onInvite is supplied', async () => {
    const user = userEvent.setup()
    const onInvite = vi.fn()
    render(<WaitersPageHeader onInvite={onInvite} />)

    const button = screen.getByRole('button', { name: 'Invitar mesero' })
    expect(button).toBeEnabled()
    expect(
      screen.queryByText(/campos de la invitación y el mapeo de rol/),
    ).not.toBeInTheDocument()

    await user.click(button)
    expect(onInvite).toHaveBeenCalledOnce()
  })
})
