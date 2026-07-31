import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { WaiterListItem } from '@/features/waiters/components/WaiterListItem'
import { WAITERS_FIXTURE } from '@/features/waiters/fixtures/waiterFixtures'

function firstWaiter() {
  const waiter = WAITERS_FIXTURE[0]
  if (!waiter) {
    throw new Error('Expected at least one fixture waiter')
  }
  return waiter
}

describe('WaiterListItem', () => {
  it('renders as a non-interactive item (no button, no link) when no onSelect is supplied', () => {
    const waiter = firstWaiter()
    render(
      <ul>
        <WaiterListItem waiter={waiter} />
      </ul>,
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText(waiter.nombreCompleto)).toBeInTheDocument()
  })

  it('renders as a keyboard-operable button and invokes onSelect with the opaque id when supplied', async () => {
    const user = userEvent.setup()
    const waiter = firstWaiter()
    const onSelect = vi.fn()
    render(
      <ul>
        <WaiterListItem waiter={waiter} onSelect={onSelect} />
      </ul>,
    )

    const button = screen.getByRole('button')
    button.focus()
    await user.keyboard('{Enter}')

    expect(onSelect).toHaveBeenCalledWith(waiter.id)
  })

  it('never renders the technical id as visible text, in either mode', () => {
    const waiter = firstWaiter()
    const { rerender } = render(
      <ul>
        <WaiterListItem waiter={waiter} />
      </ul>,
    )
    expect(screen.queryByText(waiter.id)).not.toBeInTheDocument()

    rerender(
      <ul>
        <WaiterListItem waiter={waiter} onSelect={vi.fn()} />
      </ul>,
    )
    expect(screen.queryByText(waiter.id)).not.toBeInTheDocument()
  })

  it('renders identical field content in both modes — only the interactivity differs', () => {
    const waiter = firstWaiter()
    const { rerender } = render(
      <ul>
        <WaiterListItem waiter={waiter} />
      </ul>,
    )
    expect(screen.getByText(waiter.correo)).toBeInTheDocument()

    rerender(
      <ul>
        <WaiterListItem waiter={waiter} onSelect={vi.fn()} />
      </ul>,
    )
    expect(screen.getByText(waiter.correo)).toBeInTheDocument()
    // Exactly one accessible representation exists at a time — no
    // duplicate static+interactive rendering.
    expect(screen.getAllByText(waiter.nombreCompleto)).toHaveLength(1)
  })
})
