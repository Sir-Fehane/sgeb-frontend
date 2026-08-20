import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { WaiterList } from '@/features/waiters/components/WaiterList'
import type { WaiterListItemViewModel } from '@/features/waiters/types/waiter'

const SAMPLE_WAITERS: WaiterListItemViewModel[] = [
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    nombreCompleto: 'Juana Pérez López',
    correo: 'juana.perez@example.com',
    telefono: '+52 871 000 0001',
    estadoCuenta: 'activo',
  },
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    nombreCompleto: 'Carlos Ruiz Mena',
    correo: 'carlos.ruiz@example.com',
    telefono: null,
    estadoCuenta: 'inactivo',
  },
]

describe('WaiterList', () => {
  it('renders documented waiter information (nombre, correo, teléfono, estado) for each waiter', () => {
    render(<WaiterList waiters={SAMPLE_WAITERS} />)

    const first = SAMPLE_WAITERS[0]!
    expect(screen.getByText(first.nombreCompleto)).toBeInTheDocument()
    expect(screen.getByText(first.correo)).toBeInTheDocument()
    expect(screen.getByText(first.telefono!)).toBeInTheDocument()
  })

  it('shows "No registrado" for a waiter with no phone on file, rather than omitting the field silently', () => {
    render(<WaiterList waiters={SAMPLE_WAITERS} />)

    expect(screen.getAllByText('No registrado').length).toBeGreaterThan(0)
  })

  it('renders every documented estadoCuenta as its text label', () => {
    render(<WaiterList waiters={SAMPLE_WAITERS} />)

    expect(screen.getAllByText('Activo').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Inactivo').length).toBeGreaterThan(0)
  })

  it('never displays the technical id identifier as visible text', () => {
    render(<WaiterList waiters={SAMPLE_WAITERS} />)

    for (const waiter of SAMPLE_WAITERS) {
      expect(screen.queryByText(waiter.id)).not.toBeInTheDocument()
    }
  })

  describe('without onSelectWaiter (no approved selection action)', () => {
    it('renders no interactive controls at all — items are static, not buttons or links', () => {
      render(<WaiterList waiters={SAMPLE_WAITERS} />)

      expect(screen.queryAllByRole('button')).toHaveLength(0)
      expect(screen.queryAllByRole('link')).toHaveLength(0)
    })
  })

  describe('with onSelectWaiter supplied', () => {
    it('exposes exactly one interactive control per waiter', () => {
      render(<WaiterList waiters={SAMPLE_WAITERS} onSelectWaiter={vi.fn()} />)

      expect(screen.getAllByRole('button')).toHaveLength(SAMPLE_WAITERS.length)
    })

    it('invokes onSelectWaiter with the opaque id when a waiter is chosen', async () => {
      const user = userEvent.setup()
      const onSelectWaiter = vi.fn()
      render(<WaiterList waiters={SAMPLE_WAITERS} onSelectWaiter={onSelectWaiter} />)

      const first = SAMPLE_WAITERS[0]!
      await user.click(screen.getByText(first.nombreCompleto))

      expect(onSelectWaiter).toHaveBeenCalledWith(first.id)
    })
  })
})
