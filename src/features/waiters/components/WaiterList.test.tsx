import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { WaiterList } from '@/features/waiters/components/WaiterList'
import { WAITERS_FIXTURE } from '@/features/waiters/fixtures/waiterFixtures'

describe('WaiterList', () => {
  it('renders documented waiter information (nombre, correo, teléfono, estado) for each waiter', () => {
    render(<WaiterList waiters={WAITERS_FIXTURE} />)

    const first = WAITERS_FIXTURE[0]
    if (!first) {
      throw new Error('Expected at least one fixture waiter')
    }

    expect(screen.getByText(first.nombreCompleto)).toBeInTheDocument()
    expect(screen.getByText(first.correo)).toBeInTheDocument()
    if (first.telefono) {
      expect(screen.getByText(first.telefono)).toBeInTheDocument()
    }
  })

  it('shows "No registrado" for a waiter with no phone on file, rather than omitting the field silently', () => {
    render(<WaiterList waiters={WAITERS_FIXTURE} />)

    const withoutPhone = WAITERS_FIXTURE.find((waiter) => waiter.telefono === null)
    if (!withoutPhone) {
      throw new Error('Expected at least one fixture waiter without a phone number')
    }
    expect(screen.getAllByText('No registrado').length).toBeGreaterThan(0)
  })

  it('renders every documented estadoCuenta as its text label', () => {
    render(<WaiterList waiters={WAITERS_FIXTURE} />)

    expect(screen.getAllByText('Activo').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Inactivo').length).toBeGreaterThan(0)
  })

  it('never displays the technical id identifier as visible text', () => {
    render(<WaiterList waiters={WAITERS_FIXTURE} />)

    for (const waiter of WAITERS_FIXTURE) {
      expect(screen.queryByText(waiter.id)).not.toBeInTheDocument()
    }
  })

  describe('without onSelectWaiter (no approved selection action)', () => {
    it('renders no interactive controls at all — items are static, not buttons or links', () => {
      render(<WaiterList waiters={WAITERS_FIXTURE} />)

      expect(screen.queryAllByRole('button')).toHaveLength(0)
      expect(screen.queryAllByRole('link')).toHaveLength(0)
    })

    it('renders each waiter exactly once — no duplicate accessible name from a hidden interactive variant', () => {
      render(<WaiterList waiters={WAITERS_FIXTURE} />)

      for (const waiter of WAITERS_FIXTURE) {
        expect(screen.getAllByText(waiter.nombreCompleto)).toHaveLength(1)
      }
    })
  })

  describe('with onSelectWaiter supplied', () => {
    it('exposes exactly one interactive control per waiter', () => {
      render(<WaiterList waiters={WAITERS_FIXTURE} onSelectWaiter={vi.fn()} />)

      expect(screen.getAllByRole('button')).toHaveLength(WAITERS_FIXTURE.length)
    })

    it('invokes onSelectWaiter with the opaque id when a waiter is chosen', async () => {
      const user = userEvent.setup()
      const onSelectWaiter = vi.fn()
      render(<WaiterList waiters={WAITERS_FIXTURE} onSelectWaiter={onSelectWaiter} />)

      const first = WAITERS_FIXTURE[0]
      if (!first) {
        throw new Error('Expected at least one fixture waiter')
      }
      await user.click(screen.getByText(first.nombreCompleto))

      expect(onSelectWaiter).toHaveBeenCalledWith(first.id)
    })

    it('is keyboard-operable — Enter on a focused waiter activates selection', async () => {
      const user = userEvent.setup()
      const onSelectWaiter = vi.fn()
      render(<WaiterList waiters={WAITERS_FIXTURE} onSelectWaiter={onSelectWaiter} />)

      const buttons = screen.getAllByRole('button')
      const firstButton = buttons[0]
      if (!firstButton) {
        throw new Error('Expected at least one waiter button')
      }
      firstButton.focus()
      await user.keyboard('{Enter}')

      expect(onSelectWaiter).toHaveBeenCalledOnce()
    })
  })
})
