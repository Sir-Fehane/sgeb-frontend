import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { LoginForm, type LoginFormProps } from '@/features/auth/components/LoginForm'

function renderLoginForm(overrides: Partial<LoginFormProps> = {}) {
  const onSubmit = overrides.onSubmit ?? vi.fn()
  render(
    <MemoryRouter>
      <LoginForm {...overrides} onSubmit={onSubmit} />
    </MemoryRouter>,
  )
  return { onSubmit }
}

describe('LoginForm', () => {
  it('labels every field accessibly', () => {
    renderLoginForm()

    expect(screen.getByLabelText(/^Correo/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Contraseña/)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: '¿Olvidaste tu contraseña?' }),
    ).toHaveAttribute('href', '/recuperar')
  })

  it('does not render the "Recordar este equipo" checkbox — the login contract has no matching field', () => {
    renderLoginForm()

    expect(screen.queryByText('Recordar este equipo')).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('never renders token_dispositivo as a field, editable or otherwise', () => {
    renderLoginForm()

    expect(document.querySelector('[name="token_dispositivo"]')).toBeNull()
    expect(document.querySelector('[name="tokenDispositivo"]')).toBeNull()
    expect(screen.queryByLabelText(/dispositivo/i)).not.toBeInTheDocument()
  })

  it('shows an accessible error for an invalid email and does not submit', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderLoginForm()

    await user.type(screen.getByLabelText(/^Correo/), 'no-es-un-correo')
    await user.type(screen.getByLabelText(/^Contraseña/), 'ClaveSegura1!')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('correo válido')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('invokes the supplied callback with only the documented, user-entered login fields', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderLoginForm()

    await user.type(screen.getByLabelText(/^Correo/), 'capitan@mediocres.mx')
    await user.type(screen.getByLabelText(/^Contraseña/), 'ClaveSegura1!')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    // Exact-object equality here also guarantees no extra field (e.g. a
    // reintroduced recordarEquipo) sneaks into the payload.
    expect(onSubmit).toHaveBeenCalledWith(
      {
        correo: 'capitan@mediocres.mx',
        password: 'ClaveSegura1!',
      },
      expect.anything(),
    )
  })

  it('disables the submit button and shows a busy indicator while submitting', () => {
    renderLoginForm({ isSubmitting: true })

    // The spinner's own accessible label changes the button's computed
    // name while loading (see button.test.tsx); the password toggle is
    // also a `<button>`, so target the submit button by type instead.
    const button = screen.getByRole('button', { name: /Cargando/ })
    expect(button).toHaveAttribute('type', 'submit')
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })

  it('renders the supplied server feedback message', () => {
    renderLoginForm({
      serverFeedback: { tone: 'danger', message: 'Correo o contraseña incorrectos.' },
    })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Correo o contraseña incorrectos.',
    )
  })
})
