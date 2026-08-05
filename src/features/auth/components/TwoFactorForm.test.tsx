import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import {
  TwoFactorForm,
  type TwoFactorFormProps,
} from '@/features/auth/components/TwoFactorForm'

function renderTwoFactorForm(overrides: Partial<TwoFactorFormProps> = {}) {
  const onSubmit = overrides.onSubmit ?? vi.fn()
  const onResend = overrides.onResend ?? vi.fn()
  render(<TwoFactorForm {...overrides} onSubmit={onSubmit} onResend={onResend} />)
  return { onSubmit, onResend }
}

function nth<T>(items: T[], index: number): T {
  const item = items[index]
  if (item === undefined) {
    throw new Error(`Expected an element at index ${String(index)}`)
  }
  return item
}

function getCodeBoxes() {
  const group = screen.getByRole('group', { name: 'Código de verificación de 6 dígitos' })
  return within(group).getAllByRole('textbox')
}

async function typeCode(user: ReturnType<typeof userEvent.setup>, digits: string) {
  const boxes = getCodeBoxes()
  for (let index = 0; index < digits.length; index += 1) {
    await user.type(nth(boxes, index), nth([...digits], index))
  }
}

describe('TwoFactorForm', () => {
  it('only accepts six numerical digits, one per box', async () => {
    const user = userEvent.setup()
    renderTwoFactorForm()

    const boxes = getCodeBoxes()
    expect(boxes).toHaveLength(6)

    await user.type(nth(boxes, 0), 'a')
    expect(nth(boxes, 0)).toHaveValue('')

    await user.type(nth(boxes, 0), '7')
    expect(nth(boxes, 0)).toHaveValue('7')
  })

  it('shows an accessible error for an incomplete code', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderTwoFactorForm()

    await typeCode(user, '482')
    await user.click(screen.getByRole('button', { name: 'Verificar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('6 dígitos')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('invokes the submit callback with the entered code once all six digits are present', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderTwoFactorForm()

    await typeCode(user, '482913')
    await user.click(screen.getByRole('button', { name: 'Verificar' }))

    expect(onSubmit).toHaveBeenCalledWith(
      { codigo: '482913', confiarDispositivo: false },
      expect.anything(),
    )
  })

  it('includes confiarDispositivo:true in the submit payload when "Confiar en este dispositivo 30 días" is checked, matching POST /auth/verificacion', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderTwoFactorForm()

    await typeCode(user, '482913')
    await user.click(
      screen.getByRole('checkbox', { name: 'Confiar en este dispositivo 30 días' }),
    )
    await user.click(screen.getByRole('button', { name: 'Verificar' }))

    // Exact-object equality here also guarantees no extra field (e.g. a
    // nombre_dispositivo) sneaks into the payload.
    expect(onSubmit).toHaveBeenCalledWith(
      { codigo: '482913', confiarDispositivo: true },
      expect.anything(),
    )
  })

  it('never renders nombre_dispositivo — no approved web UX exists for naming a device', () => {
    renderTwoFactorForm()

    expect(document.querySelector('[name="nombre_dispositivo"]')).toBeNull()
    expect(document.querySelector('[name="nombreDispositivo"]')).toBeNull()
    expect(screen.queryByLabelText(/nombre.*dispositivo/i)).not.toBeInTheDocument()
  })

  it('renders the supplied masked email', () => {
    renderTwoFactorForm({ correoEnmascarado: 'ju***@co***.com' })

    expect(screen.getByText(/ju\*\*\*@co\*\*\*\.com/)).toBeInTheDocument()
  })

  it('does not invoke onResend while resendDisabled is true', async () => {
    const user = userEvent.setup()
    const { onResend } = renderTwoFactorForm({ resendDisabled: true })

    const resendButton = screen.getByRole('button', { name: 'Reenviar código' })
    expect(resendButton).toBeDisabled()

    await user.click(resendButton)
    expect(onResend).not.toHaveBeenCalled()
  })

  it('invokes onResend when the resend action is available and activated', async () => {
    const user = userEvent.setup()
    const { onResend } = renderTwoFactorForm()

    await user.click(screen.getByRole('button', { name: 'Reenviar código' }))
    expect(onResend).toHaveBeenCalledOnce()
  })

  it('never renders ticket_2fa as a field or value anywhere in the form', () => {
    renderTwoFactorForm()

    expect(document.querySelector('[name="ticket2fa"]')).toBeNull()
    expect(document.querySelector('[name="ticket_2fa"]')).toBeNull()
  })
})
