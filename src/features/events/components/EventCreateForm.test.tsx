import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { EventCreateForm } from '@/features/events/components/EventCreateForm'
import { SALON_OPTIONS_FIXTURE } from '@/features/events/fixtures/eventFixtures'
import { getTodayIsoDate } from '@/features/events/utils/eventScheduling'

function renderForm(onSubmit = vi.fn()) {
  render(<EventCreateForm onSubmit={onSubmit} salones={SALON_OPTIONS_FIXTURE} />)
  return { onSubmit }
}

/** Fills every required field with a valid value, except overrides. */
async function fillValidForm(
  user: ReturnType<typeof userEvent.setup>,
  overrides: {
    titulo?: string
    numMesas?: string
    fecha?: string
    horaInicio?: string
  } = {},
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
    screen.getByLabelText(/^Hora de inicio del evento/),
    overrides.horaInicio ?? '18:00',
  )

  await user.selectOptions(screen.getByLabelText(/^Salón/), '1')
  await user.type(screen.getByLabelText(/^Número de mesas/), overrides.numMesas ?? '10')
  await user.type(screen.getByLabelText(/^Cupo de meseros/), '5')
  await user.type(screen.getByLabelText(/^Radio permitido para registrar llegada/), '150')
  await user.type(screen.getByLabelText(/^Tarifa por mesero/), '400')
}

describe('EventCreateForm', () => {
  it('rejects submission when required fields are empty', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()

    await user.click(screen.getByRole('button', { name: 'Crear evento' }))

    expect(await screen.findAllByRole('alert')).not.toHaveLength(0)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a título shorter than the documented minimum of 3 characters', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()

    await fillValidForm(user, { titulo: 'ab' })
    await user.click(screen.getByRole('button', { name: 'Crear evento' }))

    expect(await screen.findByText(/al menos 3 caracteres/)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('accepts a título at exactly the documented minimum of 3 characters', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()

    await fillValidForm(user, { titulo: 'abc' })
    await user.click(screen.getByRole('button', { name: 'Crear evento' }))

    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it('accepts a título at exactly the documented maximum of 120 characters', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()

    const exactly120 = 'T'.repeat(120)
    await fillValidForm(user, { titulo: exactly120 })
    await user.click(screen.getByRole('button', { name: 'Crear evento' }))

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
    await user.click(screen.getByRole('button', { name: 'Crear evento' }))

    expect(await screen.findByText(/no puede superar 120 caracteres/)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('enforces SGEB-4007: num_mesas must not exceed the selected salón capacity', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()

    // Salón fixture id=1 ("Salón Roble") has capacidadMaxMesas: 40 — 50
    // stays within num_mesas' own 1-255 range but exceeds that capacity.
    await fillValidForm(user, { numMesas: '50' })
    await user.click(screen.getByRole('button', { name: 'Crear evento' }))

    expect(
      await screen.findByText(/no puede superar la capacidad del salón/),
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('asks for the event date exactly once — a single date input, plus separate presentation/start TIME inputs, no duplicate inicio-date field', () => {
    renderForm()

    expect(screen.getAllByLabelText(/^Fecha/)).toHaveLength(1)
    expect(screen.getByLabelText(/^Fecha del evento/)).toHaveAttribute('type', 'date')
    expect(screen.getByLabelText(/^Hora de presentación/)).toHaveAttribute('type', 'time')
    expect(screen.getByLabelText(/^Hora de inicio del evento/)).toHaveAttribute(
      'type',
      'time',
    )
  })

  it('sets the date input min to today, so the native picker cannot offer a past date', () => {
    renderForm()

    expect(screen.getByLabelText(/^Fecha del evento/)).toHaveAttribute(
      'min',
      getTodayIsoDate(),
    )
  })

  it('rejects a hora_inicio combined with fecha that is already in the past, without introducing any horaPresentacion ordering rule', async () => {
    // A fixed system time makes "today" + "an earlier hora_inicio" a
    // deterministic past instant, regardless of when this suite actually
    // runs (never a flaky, wall-clock-dependent near-midnight case).
    // `fireEvent` (synchronous, no internal delays) avoids any interaction
    // between fake timers and userEvent's own timer-driven typing. Only
    // `Date` is faked — `setTimeout`/`setInterval` stay real, so
    // `findByText`'s own internal polling (which relies on a real timer)
    // still ticks normally instead of hanging until the outer test timeout.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2099-01-10T12:00:00'))
    try {
      const onSubmit = vi.fn()
      render(<EventCreateForm onSubmit={onSubmit} salones={SALON_OPTIONS_FIXTURE} />)

      fireEvent.change(screen.getByLabelText(/^Título/), {
        target: { value: 'Evento válido de prueba' },
      })
      fireEvent.change(screen.getByLabelText(/^Tipo de evento/), {
        target: { value: 'social' },
      })
      fireEvent.change(screen.getByLabelText(/^Fecha del evento/), {
        target: { value: '2099-01-10' },
      })
      fireEvent.change(screen.getByLabelText(/^Hora de presentación/), {
        target: { value: '16:00' },
      })
      fireEvent.change(screen.getByLabelText(/^Hora de inicio del evento/), {
        target: { value: '08:00' },
      })
      fireEvent.change(screen.getByLabelText(/^Salón/), { target: { value: '1' } })
      fireEvent.change(screen.getByLabelText(/^Número de mesas/), {
        target: { value: '10' },
      })
      fireEvent.change(screen.getByLabelText(/^Cupo de meseros/), {
        target: { value: '5' },
      })
      fireEvent.change(screen.getByLabelText(/^Radio permitido para registrar llegada/), {
        target: { value: '150' },
      })
      fireEvent.change(screen.getByLabelText(/^Tarifa por mesero/), {
        target: { value: '400' },
      })
      fireEvent.click(screen.getByRole('button', { name: 'Crear evento' }))

      expect(
        await screen.findByText(/hora de inicio no puede ser anterior a este momento/),
      ).toBeInTheDocument()
      expect(onSubmit).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('invokes the supplied callback with only the fields this form actually captures, never fabricating uuid_capitan or comanda_url', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Crear evento' }))

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

  it('presents radio_geocerca_m as a real-world arrival radius — helper copy and an "m" unit, same 10-1000 range, no invented default', async () => {
    const user = userEvent.setup()
    renderForm()

    expect(
      screen.getByText(
        /El personal debe estar dentro de esta distancia del salón para poder registrar su llegada/,
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('m')).toBeInTheDocument()

    const radiusInput = screen.getByLabelText(/^Radio permitido para registrar llegada/)
    expect(radiusInput).toHaveValue(null)

    await user.type(radiusInput, '150')
    expect(radiusInput).toHaveValue(150)
  })

  it('never renders an authenticated-user id, creator id, token, or role field', () => {
    renderForm()

    expect(screen.queryByLabelText(/token/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/rol/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/creador/i)).not.toBeInTheDocument()
    expect(document.querySelector('[name="id_usuario_creador"]')).toBeNull()
    expect(document.querySelector('[name="token"]')).toBeNull()
  })

  it('does not render a captain selector — uuid_capitan is resolved from the session, never a picker', () => {
    renderForm()

    expect(screen.queryByLabelText(/^Capitán/)).not.toBeInTheDocument()
    expect(document.querySelector('[name="uuid_capitan"]')).toBeNull()
    expect(document.querySelector('[name="id_capitan"]')).toBeNull()
    expect(
      screen.getByText(
        'Este evento quedará a tu nombre, a partir de tu sesión iniciada.',
      ),
    ).toBeInTheDocument()
  })

  it('does not render a comanda URL field or a file input, and explains comanda is a post-creation step honestly', () => {
    renderForm()

    expect(document.querySelector('input[type="file"]')).toBeNull()
    expect(document.querySelector('[name="comanda_url"]')).toBeNull()
    expect(screen.queryByLabelText(/comanda/i)).not.toBeInTheDocument()
    // The real contract never declares comanda on EventoCrear at all
    // (docs/decisions.md ADR-007) — this must never claim the upload
    // endpoint is undefined; it is, just not part of this form.
    expect(
      screen.queryByText(/pendiente de definición del endpoint/i),
    ).not.toBeInTheDocument()
    expect(
      screen.getByText(
        'La comanda se sube después de crear el evento, desde su detalle — no forma parte de este alta.',
      ),
    ).toBeInTheDocument()
  })
})
