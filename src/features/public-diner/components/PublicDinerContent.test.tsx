import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import {
  PublicDinerContent,
  type PublicDinerContentProps,
} from '@/features/public-diner/components/PublicDinerContent'
import { PUBLIC_DINER_TABLE_FIXTURE } from '@/features/public-diner/fixtures/publicDinerFixtures'

function renderContent(overrides: Partial<PublicDinerContentProps> = {}) {
  render(
    <PublicDinerContent
      table={PUBLIC_DINER_TABLE_FIXTURE}
      requestStatus="idle"
      ratingStatus="idle"
      {...overrides}
    />,
  )
}

describe('PublicDinerContent', () => {
  it('renders the populated table context when isLoading/notFound/errorMessage are absent', () => {
    renderContent()

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: PUBLIC_DINER_TABLE_FIXTURE.etiqueta,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(`Te atiende: ${PUBLIC_DINER_TABLE_FIXTURE.mesero}`),
    ).toBeInTheDocument()
  })

  it('renders only the loading state when isLoading is true — no table context, no actions', () => {
    renderContent({ isLoading: true })

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Llamar al mesero' }),
    ).not.toBeInTheDocument()
  })

  it('renders the unavailable-mesa state when notFound is true, not the app-wide not-found page', () => {
    renderContent({ notFound: true })

    expect(screen.getByText('No encontramos esta mesa')).toBeInTheDocument()
    expect(
      screen.getByText('Revisa el enlace del código QR o solicita ayuda al personal.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Llamar al mesero' }),
    ).not.toBeInTheDocument()
  })

  it('renders a retry action in the unavailable state only when supplied', () => {
    const onRetry = vi.fn()
    renderContent({ notFound: true, onRetry })

    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('renders only the global error state when errorMessage is set — no table context underneath', () => {
    renderContent({ errorMessage: 'Ocurrió un problema inesperado.' })

    expect(screen.getByText('Ocurrió un problema inesperado.')).toBeInTheDocument()
    expect(
      screen.queryByText(PUBLIC_DINER_TABLE_FIXTURE.etiqueta),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Llamar al mesero' }),
    ).not.toBeInTheDocument()
  })

  it('invokes onRetry from the global error state', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    renderContent({ errorMessage: 'Error.', onRetry })

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('never renders tokenComensal anywhere, in any state', () => {
    renderContent()
    expect(
      screen.queryByText(PUBLIC_DINER_TABLE_FIXTURE.tokenComensal),
    ).not.toBeInTheDocument()

    renderContent({ isLoading: true })
    expect(
      screen.queryByText(PUBLIC_DINER_TABLE_FIXTURE.tokenComensal),
    ).not.toBeInTheDocument()

    renderContent({ notFound: true })
    expect(
      screen.queryByText(PUBLIC_DINER_TABLE_FIXTURE.tokenComensal),
    ).not.toBeInTheDocument()
  })

  it('wires the attention request and rating callbacks through to the child components', async () => {
    const user = userEvent.setup()
    const onRequestAttention = vi.fn()
    renderContent({ onRequestAttention })

    await user.click(screen.getByRole('button', { name: 'Llamar al mesero' }))

    expect(onRequestAttention).toHaveBeenCalledOnce()
  })
})
