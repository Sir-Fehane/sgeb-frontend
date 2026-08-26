import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import {
  WaitersContent,
  type WaitersContentProps,
} from '@/features/waiters/components/WaitersContent'
import { DEFAULT_WAITERS_FILTER_STATE } from '@/features/waiters/types/waiter'
import type { WaiterListItemViewModel } from '@/features/waiters/types/waiter'

const SAMPLE_WAITERS: WaiterListItemViewModel[] = [
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    nombreCompleto: 'Juana Pérez López',
    correo: 'juana.perez@example.com',
    telefono: '+52 871 000 0001',
    estadoCuenta: 'activo',
  },
]

function renderContent(overrides: Partial<WaitersContentProps> = {}) {
  const onFilterChange = overrides.onFilterChange ?? vi.fn()
  const onInvite = overrides.onInvite ?? vi.fn()
  render(
    <WaitersContent
      canView
      waiters={SAMPLE_WAITERS}
      filters={DEFAULT_WAITERS_FILTER_STATE}
      onFilterChange={onFilterChange}
      onInvite={onInvite}
      {...overrides}
    />,
  )
  return { onFilterChange, onInvite }
}

describe('WaitersContent', () => {
  it('renders the populated list when waiters is non-empty and isLoading/errorMessage are absent', () => {
    renderContent()

    expect(screen.getByText(SAMPLE_WAITERS[0]!.nombreCompleto)).toBeInTheDocument()
    expect(
      screen.queryByRole('status', { name: 'Cargando meseros' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders the loading state when isLoading is true, regardless of waiters', () => {
    renderContent({ isLoading: true })

    expect(screen.getByRole('status', { name: 'Cargando meseros' })).toBeInTheDocument()
    expect(screen.queryByText(SAMPLE_WAITERS[0]!.nombreCompleto)).not.toBeInTheDocument()
  })

  it('renders the error state (with retry) when errorMessage is set, taking priority over waiters', () => {
    const onRetry = vi.fn()
    renderContent({ errorMessage: 'Ocurrió un problema inesperado.', onRetry })

    expect(screen.getByRole('alert')).toHaveTextContent('Ocurrió un problema inesperado.')
    expect(screen.queryByText(SAMPLE_WAITERS[0]!.nombreCompleto)).not.toBeInTheDocument()
  })

  it('invokes onRetry from the error state', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    renderContent({ errorMessage: 'Error.', onRetry })

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('renders the empty state when waiters is empty and isLoading/errorMessage are absent', () => {
    renderContent({ waiters: [] })

    expect(
      screen.getByText('No hay meseros que coincidan con los filtros actuales.'),
    ).toBeInTheDocument()
  })

  it('invokes onInvite when the header invite action is activated', async () => {
    const user = userEvent.setup()
    const { onInvite } = renderContent()

    await user.click(screen.getByRole('button', { name: 'Invitar mesero' }))

    expect(onInvite).toHaveBeenCalledOnce()
  })

  it('disables the invite action when isInviteDisabled is true', () => {
    renderContent({ isInviteDisabled: true })

    expect(screen.getByRole('button', { name: 'Invitar mesero' })).toBeDisabled()
  })

  it('renders waiter items as non-interactive when onSelectWaiter is not supplied — no waiter row is a button', () => {
    renderContent()

    const buttonNames = screen.getAllByRole('button').map((button) => button.textContent)
    expect(buttonNames).toEqual(['Invitar mesero', 'Limpiar filtros'])
  })

  it('renders waiter items as interactive buttons when onSelectWaiter is supplied', () => {
    renderContent({ onSelectWaiter: vi.fn() })

    expect(screen.getAllByRole('button')).toHaveLength(SAMPLE_WAITERS.length + 2)
  })

  it('renders the forbidden state instead of the roster when canView is false', () => {
    renderContent({ canView: false })

    expect(
      screen.getByText('No tienes permiso para ver esta sección'),
    ).toBeInTheDocument()
    expect(screen.queryByText(SAMPLE_WAITERS[0]!.nombreCompleto)).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Invitar mesero' }),
    ).not.toBeInTheDocument()
  })
})
