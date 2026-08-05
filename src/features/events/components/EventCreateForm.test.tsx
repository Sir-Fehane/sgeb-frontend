import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { EventCreateForm } from '@/features/events/components/EventCreateForm'
import { SALON_OPTIONS_FIXTURE } from '@/features/events/fixtures/eventFixtures'

function renderForm(onSubmit = vi.fn()) {
  render(<EventCreateForm onSubmit={onSubmit} salones={SALON_OPTIONS_FIXTURE} />)
  return { onSubmit }
}

/** Fills every required field with a valid value, except overrides. */
async function fillValidForm(
  user: ReturnType<typeof userEvent.setup>,
  overrides: { titulo?: string; numMesas?: string; inicio?: string; fecha?: string } = {},
) {
  await user.type(
    screen.getByLabelText(/^Título/),
    overrides.titulo ?? 'Evento válido de prueba',
  )
  await user.selectOptions(screen.getByLabelText(/^Tipo de evento/), 'social')

  const fecha = overrides.fecha ?? '2099-01-10'
  await user.type(screen.getByLabelText(/^Fecha del evento/), fecha)
  await user.type(screen.getByLabelText(/^Hora de presentación/), '16:00')
  await user.type(
    screen.getByLabelText(/^Fecha y hora de inicio/),
    overrides.inicio ?? `${fecha}T18:00`,
  )

  await user.selectOptions(screen.getByLabelText(/^Salón/), '1')
  await user.type(screen.getByLabelText(/^Número de mesas/), overrides.numMesas ?? '10')
  await user.type(screen.getByLabelText(/^Cupo de meseros/), '5')
  await user.type(screen.getByLabelText(/^Radio de geocerca/), '150')
  await user.type(screen.getByLabelText(/^Tarifa por mesero/), '400')
}

describe('EventCreateForm', () => {
  it('rejects submission when required fields are empty', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()

    await user.click(screen.getByRole('button', { name: 'Validar borrador' }))

    expect(await screen.findAllByRole('alert')).not.toHaveLength(0)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a título shorter than the documented minimum of 3 characters', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()

    await fillValidForm(user, { titulo: 'ab' })
    await user.click(screen.getByRole('button', { name: 'Validar borrador' }))

    expect(await screen.findByText(/al menos 3 caracteres/)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('accepts a título at exactly the documented minimum of 3 characters', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()

    await fillValidForm(user, { titulo: 'abc' })
    await user.click(screen.getByRole('button', { name: 'Validar borrador' }))

    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('accepts a título at exactly the documented maximum of 120 characters', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()

    const exactly120 = 'T'.repeat(120)
    await fillValidForm(user, { titulo: exactly120 })
    await user.click(screen.getByRole('button', { name: 'Validar borrador' }))

    expect(onSubmit).toHaveBeenCalledOnce()
    const [payload] = onSubmit.mock.calls[0] as [Record<string, unknown>]
    expect(payload.titulo).toBe(exactly120)
  })

  it('rejects a título longer than the documented maximum of 120 characters', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()

    await fillValidForm(user)

    // The Input's `maxLength={120}` HTML attribute already stops a real
    // user from *typing* past 120 characters — `user.type` can't
    // exercise the over-limit case at all, since the DOM itself refuses
    // the 121st keystroke. `fireEvent.change` sets the value directly
    // (bypassing that browser-level restriction) so this test proves
    // the Zod rule independently rejects an over-limit value, as a
    // defense-in-depth check behind the HTML attribute.
    fireEvent.change(screen.getByLabelText(/^Título/), {
      target: { value: 'T'.repeat(121) },
    })
    await user.click(screen.getByRole('button', { name: 'Validar borrador' }))

    expect(await screen.findByText(/no puede superar 120 caracteres/)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('enforces SGEB-4007: num_mesas must not exceed the selected salón capacity', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()

    // Salón fixture id=1 ("Salón Roble") has capacidadMaxMesas: 40 — 50
    // stays within num_mesas' own 1-255 range but exceeds that capacity.
    await fillValidForm(user, { numMesas: '50' })
    await user.click(screen.getByRole('button', { name: 'Validar borrador' }))

    expect(
      await screen.findByText(/no puede superar la capacidad del salón/),
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('enforces SGEB-2008: inicio date must match fecha', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()

    await fillValidForm(user, { fecha: '2099-01-10', inicio: '2099-01-11T18:00' })
    await user.click(screen.getByRole('button', { name: 'Validar borrador' }))

    expect(
      await screen.findByText(/fecha de inicio debe coincidir con la fecha del evento/),
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('invokes the supplied callback with only the fields this prototype actually captures, never fabricating uuid_capitan or comanda_url', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Validar borrador' }))

    expect(onSubmit).toHaveBeenCalledOnce()
    const [payload] = onSubmit.mock.calls[0] as [Record<string, unknown>]
    expect(payload).toMatchObject({
      titulo: 'Evento válido de prueba',
      tipo: 'social',
      id_salon: 1,
      num_mesas: 10,
      cupo_meseros: 5,
      radio_geocerca_m: 150,
      tarifa_por_mesero: 400,
    })
    // This callback's payload is not a complete EventoCrear request —
    // uuid_capitan and comanda_url are integration-owned and must never
    // be fabricated here (see eventCreateSchema.ts).
    expect(payload).not.toHaveProperty('uuid_capitan')
    expect(payload).not.toHaveProperty('id_capitan')
    expect(payload).not.toHaveProperty('comanda_url')
  })

  it('never renders an authenticated-user id, creator id, token, or role field', () => {
    renderForm()

    expect(screen.queryByLabelText(/token/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/rol/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/creador/i)).not.toBeInTheDocument()
    expect(document.querySelector('[name="id_usuario_creador"]')).toBeNull()
    expect(document.querySelector('[name="token"]')).toBeNull()
  })

  it('does not render a captain selector — uuid_capitan is integration-owned, not sourced from an unapproved picker', () => {
    renderForm()

    expect(screen.queryByLabelText(/^Capitán/)).not.toBeInTheDocument()
    expect(document.querySelector('[name="uuid_capitan"]')).toBeNull()
    expect(document.querySelector('[name="id_capitan"]')).toBeNull()
    expect(
      screen.getByText(
        'La asignación de capitán se definirá al integrar autenticación y permisos.',
      ),
    ).toBeInTheDocument()
  })

  it('does not render a comanda URL field or a file input', () => {
    renderForm()

    expect(document.querySelector('input[type="file"]')).toBeNull()
    expect(document.querySelector('[name="comanda_url"]')).toBeNull()
    expect(screen.queryByLabelText(/comanda/i)).not.toBeInTheDocument()
    expect(
      screen.getByText('Carga de comanda pendiente de definición del endpoint.'),
    ).toBeInTheDocument()
  })
})
