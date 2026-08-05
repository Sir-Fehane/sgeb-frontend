import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import {
  NewPasswordForm,
  type NewPasswordFormProps,
} from '@/features/auth/components/NewPasswordForm'

function renderNewPasswordForm(overrides: Partial<NewPasswordFormProps> = {}) {
  const onSubmit = overrides.onSubmit ?? vi.fn()
  render(<NewPasswordForm {...overrides} onSubmit={onSubmit} />)
  return { onSubmit }
}

async function fillPasswords(
  user: ReturnType<typeof userEvent.setup>,
  password: string,
  confirmation: string,
) {
  await user.type(screen.getByLabelText('Nueva contraseña', { exact: false }), password)
  await user.type(
    screen.getByLabelText('Confirmar contraseña', { exact: false }),
    confirmation,
  )
}

describe('NewPasswordForm', () => {
  it('reflects each individual password requirement live, never by color alone', async () => {
    const user = userEvent.setup()
    renderNewPasswordForm()

    expect(screen.getByText('Mínimo 8 caracteres')).toHaveTextContent('(pendiente)')
    expect(screen.getByText('Al menos una mayúscula')).toHaveTextContent('(pendiente)')
    expect(screen.getByText('Al menos un número')).toHaveTextContent('(pendiente)')
    expect(screen.getByText('Al menos un símbolo')).toHaveTextContent('(pendiente)')

    await user.type(
      screen.getByLabelText('Nueva contraseña', { exact: false }),
      'Segura1!',
    )

    expect(screen.getByText('Mínimo 8 caracteres')).toHaveTextContent('(cumplido)')
    expect(screen.getByText('Al menos una mayúscula')).toHaveTextContent('(cumplido)')
    expect(screen.getByText('Al menos un número')).toHaveTextContent('(cumplido)')
    expect(screen.getByText('Al menos un símbolo')).toHaveTextContent('(cumplido)')
  })

  it('rejects a password missing the required complexity on submit', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderNewPasswordForm()

    await fillPasswords(user, 'todaminuscula', 'todaminuscula')
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('no cumple los requisitos')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows a mismatch error when the confirmation differs', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderNewPasswordForm()

    await fillPasswords(user, 'Segura1!', 'Segura2!')
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('no coinciden')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('invokes the supplied callback for a valid, matching password', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderNewPasswordForm()

    await fillPasswords(user, 'Segura1!', 'Segura1!')
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

    expect(onSubmit).toHaveBeenCalledWith(
      { password: 'Segura1!', passwordConfirmacion: 'Segura1!' },
      expect.anything(),
    )
  })

  it('never accepts or renders a recovery token — the component has no such prop', () => {
    renderNewPasswordForm()

    expect(document.querySelector('[name="token"]')).toBeNull()
    expect(screen.queryByLabelText(/token/i)).not.toBeInTheDocument()
  })
})
