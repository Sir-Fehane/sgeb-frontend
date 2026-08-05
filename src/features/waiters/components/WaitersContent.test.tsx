import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import {
  WaitersContent,
  type WaitersContentProps,
} from '@/features/waiters/components/WaitersContent'
import { WAITERS_FIXTURE } from '@/features/waiters/fixtures/waiterFixtures'
import { DEFAULT_WAITERS_FILTER_STATE } from '@/features/waiters/types/waiter'

function renderContent(overrides: Partial<WaitersContentProps> = {}) {
  const onFilterChange = overrides.onFilterChange ?? vi.fn()
  render(
    <WaitersContent
      waiters={WAITERS_FIXTURE}
      filters={DEFAULT_WAITERS_FILTER_STATE}
      onFilterChange={onFilterChange}
      {...overrides}
    />,
  )
  return { onFilterChange }
}

describe('WaitersContent', () => {
  it('renders the populated list when waiters is non-empty and isLoading/errorMessage are absent', () => {
    renderContent()

    const first = WAITERS_FIXTURE[0]
    if (!first) {
      throw new Error('Expected at least one fixture waiter')
    }
    expect(screen.getByText(first.nombreCompleto)).toBeInTheDocument()
    expect(
      screen.queryByRole('status', { name: 'Cargando meseros' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders the loading state when isLoading is true, regardless of waiters', () => {
    renderContent({ isLoading: true })

    expect(screen.getByRole('status', { name: 'Cargando meseros' })).toBeInTheDocument()
    expect(
      screen.queryByText(WAITERS_FIXTURE[0]?.nombreCompleto ?? ''),
    ).not.toBeInTheDocument()
  })

  it('renders the error state (with retry) when errorMessage is set, taking priority over waiters', () => {
    const onRetry = vi.fn()
    renderContent({ errorMessage: 'Ocurrió un problema inesperado.', onRetry })

    expect(screen.getByRole('alert')).toHaveTextContent('Ocurrió un problema inesperado.')
    expect(
      screen.queryByText(WAITERS_FIXTURE[0]?.nombreCompleto ?? ''),
    ).not.toBeInTheDocument()
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

  it('always renders the header and filters alongside whichever state is active', () => {
    renderContent({ isLoading: true, onInvite: vi.fn() })

    expect(screen.getByLabelText('Estado de cuenta')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Invitar mesero' })).toBeInTheDocument()
  })

  it('renders the invite action disabled when onInvite is not supplied', () => {
    renderContent()

    expect(screen.getByRole('button', { name: 'Invitar mesero' })).toBeDisabled()
  })

  it('enables the invite action when onInvite is supplied', () => {
    renderContent({ onInvite: vi.fn() })

    expect(screen.getByRole('button', { name: 'Invitar mesero' })).toBeEnabled()
  })

  it('renders waiter items as non-interactive when onSelectWaiter is not supplied — no waiter row is a button', () => {
    renderContent()

    // Only the (disabled) invite action and the filters' "Limpiar
    // filtros" button exist — no waiter row is exposed as one.
    const buttonNames = screen.getAllByRole('button').map((button) => button.textContent)
    expect(buttonNames).toEqual(['Invitar mesero', 'Limpiar filtros'])
  })

  it('renders waiter items as interactive buttons when onSelectWaiter is supplied', () => {
    renderContent({ onSelectWaiter: vi.fn() })

    // One button per waiter, plus the invite action and "Limpiar filtros".
    expect(screen.getAllByRole('button')).toHaveLength(WAITERS_FIXTURE.length + 2)
  })
})
