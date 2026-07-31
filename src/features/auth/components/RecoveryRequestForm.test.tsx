import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import {
  RecoveryRequestForm,
  type RecoveryRequestFormProps,
} from '@/features/auth/components/RecoveryRequestForm'

function renderRecoveryRequestForm(overrides: Partial<RecoveryRequestFormProps> = {}) {
  const onSubmit = overrides.onSubmit ?? vi.fn()
  render(
    <MemoryRouter>
      <RecoveryRequestForm {...overrides} onSubmit={onSubmit} />
    </MemoryRouter>,
  )
  return { onSubmit }
}

const GENERIC_MESSAGE =
  'Si el correo está registrado, te enviamos un enlace. Revisa tu bandeja.'

describe('RecoveryRequestForm', () => {
  it('shows an accessible error for an invalid email', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderRecoveryRequestForm()

    await user.type(screen.getByLabelText('Correo', { exact: false }), 'no-es-un-correo')
    await user.click(screen.getByRole('button', { name: 'Enviar enlace' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('correo válido')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('invokes the supplied callback with a valid email', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderRecoveryRequestForm()

    await user.type(
      screen.getByLabelText('Correo', { exact: false }),
      'capitan@mediocres.mx',
    )
    await user.click(screen.getByRole('button', { name: 'Enviar enlace' }))

    expect(onSubmit).toHaveBeenCalledWith(
      { correo: 'capitan@mediocres.mx' },
      expect.anything(),
    )
  })

  it('renders the exact same generic feedback regardless of the entered email — no account enumeration', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <MemoryRouter>
        <RecoveryRequestForm
          onSubmit={vi.fn()}
          serverFeedback={{ tone: 'success', message: GENERIC_MESSAGE }}
        />
      </MemoryRouter>,
    )
    await user.type(
      screen.getByLabelText('Correo', { exact: false }),
      'cuenta-existente@mediocres.mx',
    )
    expect(screen.getByRole('status')).toHaveTextContent(GENERIC_MESSAGE)

    rerender(
      <MemoryRouter>
        <RecoveryRequestForm
          onSubmit={vi.fn()}
          serverFeedback={{ tone: 'success', message: GENERIC_MESSAGE }}
        />
      </MemoryRouter>,
    )
    await user.type(
      screen.getByLabelText('Correo', { exact: false }),
      'cuenta-inexistente@mediocres.mx',
    )
    expect(screen.getByRole('status')).toHaveTextContent(GENERIC_MESSAGE)
  })

  it('links back to the login screen', () => {
    renderRecoveryRequestForm()

    expect(screen.getByRole('link', { name: 'Volver a iniciar sesión' })).toHaveAttribute(
      'href',
      '/login',
    )
  })
})
