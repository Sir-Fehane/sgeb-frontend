import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { WaiterListItem } from '@/features/waiters/components/WaiterListItem'
import type { WaiterListItemViewModel } from '@/features/waiters/types/waiter'

const WAITER: WaiterListItemViewModel = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  nombreCompleto: 'Juana Pérez López',
  correo: 'juana.perez@example.com',
  telefono: '+52 871 000 0001',
  estadoCuenta: 'activo',
}

describe('WaiterListItem', () => {
  it('renders as a non-interactive item (no button, no link) when no onSelect is supplied', () => {
    render(
      <ul>
        <WaiterListItem waiter={WAITER} />
      </ul>,
    )

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText(WAITER.nombreCompleto)).toBeInTheDocument()
  })

  it('renders as a keyboard-operable button and invokes onSelect with the opaque id when supplied', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <ul>
        <WaiterListItem waiter={WAITER} onSelect={onSelect} />
      </ul>,
    )

    const button = screen.getByRole('button')
    button.focus()
    await user.keyboard('{Enter}')

    expect(onSelect).toHaveBeenCalledWith(WAITER.id)
  })

  it('never renders the technical id as visible text, in either mode', () => {
    const { rerender } = render(
      <ul>
        <WaiterListItem waiter={WAITER} />
      </ul>,
    )
    expect(screen.queryByText(WAITER.id)).not.toBeInTheDocument()

    rerender(
      <ul>
        <WaiterListItem waiter={WAITER} onSelect={vi.fn()} />
      </ul>,
    )
    expect(screen.queryByText(WAITER.id)).not.toBeInTheDocument()
  })
})
