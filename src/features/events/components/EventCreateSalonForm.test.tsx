import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useController, type Control } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'

import { EventCreateSalonForm } from '@/features/events/components/EventCreateSalonForm'
import type { CreateSalonFormValues } from '@/features/events/schemas/salonCreateSchema'

/**
 * `SalonLocationPicker` (address → geocoding → map → marker) has its own
 * dedicated coverage (`SalonLocationPicker.test.tsx`). This form's tests
 * only care that `latitud`/`longitud` are real, validated fields on the
 * same `control` — stubbed here as plain labeled number inputs bound via
 * `useController`, exercising the exact same RHF wiring the real picker
 * uses, without pulling in `mapbox-gl`.
 */
vi.mock('@/features/events/components/SalonLocationPicker', () => ({
  SalonLocationPicker: ({ control }: { control: Control<CreateSalonFormValues> }) => {
    const latitud = useController({ control, name: 'latitud' })
    const longitud = useController({ control, name: 'longitud' })
    return (
      <div>
        <label htmlFor="stub-latitud">Latitud</label>
        <input
          id="stub-latitud"
          type="number"
          step="any"
          value={Number.isNaN(latitud.field.value) ? '' : latitud.field.value}
          onChange={(event) => {
            latitud.field.onChange(event.target.valueAsNumber)
          }}
        />
        <label htmlFor="stub-longitud">Longitud</label>
        <input
          id="stub-longitud"
          type="number"
          step="any"
          value={Number.isNaN(longitud.field.value) ? '' : longitud.field.value}
          onChange={(event) => {
            longitud.field.onChange(event.target.valueAsNumber)
          }}
        />
      </div>
    )
  },
}))

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^Nombre/), 'Salón Nuevo')
  await user.type(screen.getByLabelText(/^Calle/), 'Av. Reforma 100')
  await user.type(screen.getByLabelText(/^Código postal/), '06600')
  await user.type(screen.getByLabelText(/^Colonia/), 'Juárez')
  await user.type(screen.getByLabelText(/^Ciudad/), 'CDMX')
  await user.type(screen.getByLabelText(/^Estado/), 'CDMX')
  await user.type(screen.getByLabelText(/^Latitud/), '19.42')
  await user.type(screen.getByLabelText(/^Longitud/), '-99.16')
  await user.type(screen.getByLabelText(/^Capacidad máxima de mesas/), '30')
  await user.type(screen.getByLabelText(/^Capacidad de personas/), '150')
}

describe('EventCreateSalonForm', () => {
  it('rejects submission when required fields are empty', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<EventCreateSalonForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Crear salón' }))

    expect(await screen.findAllByRole('alert')).not.toHaveLength(0)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a malformed código postal', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<EventCreateSalonForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    await fillValidForm(user)
    await user.clear(screen.getByLabelText(/^Código postal/))
    await user.type(screen.getByLabelText(/^Código postal/), 'abc')
    await user.click(screen.getByRole('button', { name: 'Crear salón' }))

    expect(
      await screen.findByText(/código postal debe tener 5 dígitos/),
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits exactly the real POST /salones fields', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<EventCreateSalonForm onSubmit={onSubmit} onCancel={vi.fn()} />)

    await fillValidForm(user)
    await user.click(screen.getByRole('button', { name: 'Crear salón' }))

    expect(onSubmit).toHaveBeenCalledWith({
      nombre: 'Salón Nuevo',
      calle: 'Av. Reforma 100',
      cp: '06600',
      colonia: 'Juárez',
      ciudad: 'CDMX',
      estado: 'CDMX',
      latitud: 19.42,
      longitud: -99.16,
      capacidadMaxMesas: 30,
      capacidadPersonas: 150,
    })
  })

  it('calls onCancel without submitting', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    render(<EventCreateSalonForm onSubmit={vi.fn()} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('shows the given safe error message', () => {
    render(
      <EventCreateSalonForm
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        errorMessage="No pudimos crear el salón."
      />,
    )
    expect(screen.getByText('No pudimos crear el salón.')).toBeInTheDocument()
  })
})
