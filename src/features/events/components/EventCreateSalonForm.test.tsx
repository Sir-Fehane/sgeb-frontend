import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { EventCreateSalonForm } from '@/features/events/components/EventCreateSalonForm'

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^Nombre/), 'Salón Nuevo')
  await user.type(screen.getByLabelText(/^Calle/), 'Av. Reforma 100')
  await user.type(screen.getByLabelText(/^Código postal/), '06600')
  await user.type(screen.getByLabelText(/^Colonia/), 'Juárez')
  await user.type(screen.getByLabelText(/^Ciudad/), 'CDMX')
  await user.type(screen.getByLabelText(/^Estado \(dirección\)/), 'CDMX')
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
