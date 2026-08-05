import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { RouteErrorPresentation } from '@/features/route-errors/components/RouteErrorPresentation'

function renderPresentation(
  props: Partial<Parameters<typeof RouteErrorPresentation>[0]> & {
    variant: 'not-found' | 'unexpected'
  },
) {
  return render(
    <MemoryRouter>
      <RouteErrorPresentation {...props} />
    </MemoryRouter>,
  )
}

describe('RouteErrorPresentation — not-found variant', () => {
  it('renders exactly one clear heading', () => {
    renderPresentation({ variant: 'not-found' })

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).toBeInTheDocument()
  })

  it('does not use an assertive alert for a normal not-found outcome', () => {
    renderPresentation({ variant: 'not-found' })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('links the primary action to /panel by default', () => {
    renderPresentation({ variant: 'not-found' })

    const link = screen.getByRole('link', { name: 'Volver al panel' })
    expect(link).toHaveAttribute('href', '/panel')
  })

  it('supports a custom primary destination', () => {
    renderPresentation({ variant: 'not-found', primaryActionTo: '/otra-ruta' })

    expect(screen.getByRole('link', { name: 'Volver al panel' })).toHaveAttribute(
      'href',
      '/otra-ruta',
    )
  })

  it('renders no retry action when onRetry is not supplied', () => {
    renderPresentation({ variant: 'not-found' })

    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
  })

  it('renders optional secondary text without ever exposing it as the sole message', () => {
    renderPresentation({
      variant: 'not-found',
      secondaryText: 'Verifica la dirección e intenta de nuevo.',
    })

    expect(
      screen.getByText('Verifica la dirección e intenta de nuevo.'),
    ).toBeInTheDocument()
    expect(screen.getByText('No encontramos la página que buscas.')).toBeInTheDocument()
  })
})

describe('RouteErrorPresentation — unexpected variant', () => {
  it('renders exactly one clear heading, distinct from the not-found heading', () => {
    renderPresentation({ variant: 'unexpected' })

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(
      screen.getByRole('heading', { level: 1, name: 'No pudimos abrir esta página' }),
    ).toBeInTheDocument()
  })

  it('uses an assertive alert region for a genuine unexpected error', () => {
    renderPresentation({ variant: 'unexpected' })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Ocurrió un problema inesperado al mostrar el contenido.',
    )
  })

  it('links the primary action to /panel', () => {
    renderPresentation({ variant: 'unexpected' })

    expect(screen.getByRole('link', { name: 'Volver al panel' })).toHaveAttribute(
      'href',
      '/panel',
    )
  })

  it('invokes the injected onRetry callback when the retry action is activated, never navigating for real', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    renderPresentation({ variant: 'unexpected', onRetry })

    const button = screen.getByRole('button', { name: 'Reintentar' })
    await user.click(button)

    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('never renders raw technical text — this component has no prop for it', () => {
    renderPresentation({ variant: 'unexpected' })

    expect(screen.queryByText(/at \w+ \(/)).not.toBeInTheDocument()
    expect(screen.queryByText(/TypeError|ReferenceError|stack/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/technical_message/i)).not.toBeInTheDocument()
  })
})
