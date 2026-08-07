import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { OidcCallbackContent } from '@/features/oidc-client/components/OidcCallbackContent'

describe('OidcCallbackContent', () => {
  it('renders exactly one heading in every state', () => {
    const { rerender } = render(<OidcCallbackContent state="processing" />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)

    rerender(<OidcCallbackContent state="success" />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)

    rerender(<OidcCallbackContent state="error" message="Algo salió mal." />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('renders exactly one status region while processing', () => {
    render(<OidcCallbackContent state="processing" />)

    expect(screen.getAllByRole('status')).toHaveLength(1)
  })

  it('renders the safe error message inside an alert', () => {
    render(
      <OidcCallbackContent
        state="error"
        message="No pudimos completar el inicio de sesión."
      />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No pudimos completar el inicio de sesión.',
    )
  })

  it('offers a restart action only when onRestart is supplied', () => {
    const { rerender } = render(<OidcCallbackContent state="error" message="x" />)
    expect(
      screen.queryByRole('button', { name: 'Volver a intentar' }),
    ).not.toBeInTheDocument()

    rerender(<OidcCallbackContent state="error" message="x" onRestart={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Volver a intentar' })).toBeInTheDocument()
  })

  it('invokes onRestart when the restart action is activated', async () => {
    const user = userEvent.setup()
    const onRestart = vi.fn()
    render(<OidcCallbackContent state="error" message="x" onRestart={onRestart} />)

    await user.click(screen.getByRole('button', { name: 'Volver a intentar' }))

    expect(onRestart).toHaveBeenCalledOnce()
  })

  it('never renders raw OAuth parameters, tokens, or provider stack detail', () => {
    render(
      <OidcCallbackContent
        state="error"
        message="No pudimos completar el inicio de sesión."
      />,
    )

    const rendered = document.body.textContent ?? ''
    expect(rendered).not.toMatch(
      /code_verifier|code_challenge|access_token|id_token|SSO-\d{4}/i,
    )
  })

  it('does not render a restart action while processing or on success', () => {
    const { rerender } = render(
      <OidcCallbackContent state="processing" onRestart={vi.fn()} />,
    )
    expect(
      screen.queryByRole('button', { name: 'Volver a intentar' }),
    ).not.toBeInTheDocument()

    rerender(<OidcCallbackContent state="success" onRestart={vi.fn()} />)
    expect(
      screen.queryByRole('button', { name: 'Volver a intentar' }),
    ).not.toBeInTheDocument()
  })
})
