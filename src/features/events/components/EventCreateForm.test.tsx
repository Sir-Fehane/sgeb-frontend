import { render, screen } from '@testing-library/react'
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

  it('enforces the documented título minimum of 3 characters', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()

    await fillValidForm(user, { titulo: 'ab' })
    await user.click(screen.getByRole('button', { name: 'Validar borrador' }))

    expect(await screen.findByText(/al menos 3 caracteres/)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('does not enforce a título maximum — 40 vs. 120 is an unresolved source conflict, so neither is encoded', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()

    // Longer than both candidate maximums (40 and 120).
    const longTitulo = 'T'.repeat(150)
    await fillValidForm(user, { titulo: longTitulo })
    await user.click(screen.getByRole('button', { name: 'Validar borrador' }))

    expect(onSubmit).toHaveBeenCalledOnce()
    const [payload] = onSubmit.mock.calls[0] as [Record<string, unknown>]
    expect(payload.titulo).toBe(longTitulo)
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

  it('invokes the supplied callback with the documented field names for a valid draft, excluding id_capitan and comanda_url', async () => {
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

  it("does not render a captain selector, matching id_capitan's unresolved sourcing", () => {
    renderForm()

    expect(screen.queryByLabelText(/^Capitán/)).not.toBeInTheDocument()
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
