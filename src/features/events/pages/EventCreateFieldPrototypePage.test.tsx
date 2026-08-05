import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { EventCreateFieldPrototypePage } from '@/features/events/pages/EventCreateFieldPrototypePage'

describe('EventCreateFieldPrototypePage', () => {
  it('presents itself explicitly as a prototype, not the approved creation flow', () => {
    render(<EventCreateFieldPrototypePage />)

    expect(screen.getByText('Prototipo de campos y validaciones')).toBeInTheDocument()
    expect(
      screen.getByText(/wizard de cinco pasos pendiente de validar contra el wireframe/),
    ).toBeInTheDocument()
  })

  it('labels the final action "Validar borrador", not "Crear evento"', () => {
    render(<EventCreateFieldPrototypePage />)

    expect(screen.getByRole('button', { name: 'Validar borrador' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Crear evento' })).not.toBeInTheDocument()
  })

  it('only claims successful local validation on submit, never that an event was created or persisted', async () => {
    const user = userEvent.setup()
    render(<EventCreateFieldPrototypePage />)

    await user.type(screen.getByLabelText(/^Título/), 'Evento de prueba válido')
    await user.selectOptions(screen.getByLabelText(/^Tipo de evento/), 'social')
    await user.type(screen.getByLabelText(/^Fecha del evento/), '2099-01-10')
    await user.type(screen.getByLabelText(/^Hora de presentación/), '16:00')
    await user.type(screen.getByLabelText(/^Fecha y hora de inicio/), '2099-01-10T18:00')
    await user.selectOptions(screen.getByLabelText(/^Salón/), '1')
    await user.type(screen.getByLabelText(/^Número de mesas/), '10')
    await user.type(screen.getByLabelText(/^Cupo de meseros/), '5')
    await user.type(screen.getByLabelText(/^Radio de geocerca/), '150')
    await user.type(screen.getByLabelText(/^Tarifa por mesero/), '400')

    await user.click(screen.getByRole('button', { name: 'Validar borrador' }))

    expect(await screen.findByText('Validación local exitosa')).toBeInTheDocument()
    expect(screen.getByText(/no crea ni persiste ningún evento/)).toBeInTheDocument()
    expect(screen.queryByText(/evento creado/i)).not.toBeInTheDocument()
  })

  it('renders no captain selector and no comanda URL/file field', () => {
    render(<EventCreateFieldPrototypePage />)

    expect(screen.queryByLabelText(/^Capitán/)).not.toBeInTheDocument()
    expect(document.querySelector('[name="uuid_capitan"]')).toBeNull()
    expect(document.querySelector('[name="id_capitan"]')).toBeNull()
    expect(document.querySelector('[name="comanda_url"]')).toBeNull()
    expect(document.querySelector('input[type="file"]')).toBeNull()
  })
})
