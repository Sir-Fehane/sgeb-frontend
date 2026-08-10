import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { EventClosureWasteForm } from '@/features/events/closure/components/EventClosureWasteForm'
import type { CreateWasteReportFormValues } from '@/features/events/closure/schemas/wasteReportSchema'

function renderForm(
  onSubmit = vi.fn<(values: CreateWasteReportFormValues) => Promise<void>>(() =>
    Promise.resolve(),
  ),
) {
  const utils = render(<EventClosureWasteForm onSubmit={onSubmit} />)
  return { ...utils, onSubmit }
}

describe('EventClosureWasteForm — structure', () => {
  it('starts with exactly one detail row, no remove button (cannot drop the last row)', () => {
    renderForm()

    expect(screen.getAllByText(/^Artículo \d+$/)).toHaveLength(1)
    expect(screen.queryByRole('button', { name: /Quitar/ })).not.toBeInTheDocument()
  })

  it('offers all five documented waste categories, and only those, in the type select', () => {
    renderForm()

    const select = screen.getByRole('combobox', { name: /Tipo de artículo 1/ })
    const optionLabels = Array.from(select.querySelectorAll('option')).map(
      (o) => o.textContent,
    )

    expect(optionLabels).toEqual([
      'Selecciona un tipo',
      'Vaso roto',
      'Plato roto',
      'Copa rota',
      'Comida desperdiciada',
      'Otro',
    ])
  })

  it('has a clear, specific accessible name for the submit button', () => {
    renderForm()

    expect(
      screen.getByRole('button', { name: 'Registrar reporte de merma' }),
    ).toBeInTheDocument()
  })
})

describe('EventClosureWasteForm — dynamic rows', () => {
  it('adding a row gives it distinguishable accessible field names, and a "Quitar" button appears', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Agregar artículo' }))

    expect(
      screen.getByRole('combobox', { name: /Tipo de artículo 1/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('combobox', { name: /Tipo de artículo 2/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Quitar artículo 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Quitar artículo 2' })).toBeInTheDocument()
  })

  it('removing a row is local form editing only, never framed as deleting a recorded report', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Agregar artículo' }))
    await user.click(screen.getByRole('button', { name: 'Quitar artículo 2' }))

    expect(screen.getAllByText(/^Artículo \d+$/)).toHaveLength(1)
    expect(screen.queryByText(/eliminar reporte|borrar reporte/i)).not.toBeInTheDocument()
  })

  it('never allows removing the final remaining row', () => {
    renderForm()

    expect(
      screen.queryByRole('button', { name: /Quitar artículo 1/ }),
    ).not.toBeInTheDocument()
  })
})

describe('EventClosureWasteForm — validation', () => {
  it('requires selecting a tipo before submit succeeds', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()

    await user.type(
      screen.getByRole('spinbutton', { name: /Cantidad 1/ }),
      '{selectall}5',
    )
    await user.click(screen.getByRole('button', { name: 'Registrar reporte de merma' }))

    expect(await screen.findByText('Selecciona un tipo de artículo.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects a cantidad of 0', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()

    await user.selectOptions(
      screen.getByRole('combobox', { name: /Tipo de artículo 1/ }),
      'vaso_roto',
    )
    const cantidad = screen.getByRole('spinbutton', { name: /Cantidad 1/ })
    await user.clear(cantidad)
    await user.type(cantidad, '0')
    await user.click(screen.getByRole('button', { name: 'Registrar reporte de merma' }))

    expect(await screen.findByText(/La cantidad debe ser al menos 1/)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('does not require descripcion or costo estimado', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()

    await user.selectOptions(
      screen.getByRole('combobox', { name: /Tipo de artículo 1/ }),
      'vaso_roto',
    )
    await user.click(screen.getByRole('button', { name: 'Registrar reporte de merma' }))

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const submitted = onSubmit.mock.calls[0]?.[0]
    expect(submitted?.detalles[0]?.descripcion).toBeNull()
    expect(submitted?.detalles[0]?.costo_estimado).toBeNull()
  })
})

describe('EventClosureWasteForm — submission', () => {
  it('calls the typed callback exactly once with correctly normalized values', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderForm()

    await user.selectOptions(
      screen.getByRole('combobox', { name: /Tipo de artículo 1/ }),
      'copa_rota',
    )
    const cantidad = screen.getByRole('spinbutton', { name: /Cantidad 1/ })
    await user.clear(cantidad)
    await user.type(cantidad, '4')
    await user.type(screen.getByRole('textbox', { name: /Descripción 1/ }), 'Barra')
    const costo = screen.getByRole('spinbutton', { name: /Costo estimado 1/ })
    await user.type(costo, '320')
    await user.type(
      screen.getByRole('textbox', { name: 'Observaciones' }),
      'Nota general',
    )

    await user.click(screen.getByRole('button', { name: 'Registrar reporte de merma' }))

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith({
      observaciones: 'Nota general',
      detalles: [
        { tipo: 'copa_rota', descripcion: 'Barra', cantidad: 4, costo_estimado: 320 },
      ],
    })
  })

  it('shows a restrained local success message and resets the form after submission', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.selectOptions(
      screen.getByRole('combobox', { name: /Tipo de artículo 1/ }),
      'otro',
    )
    await user.click(screen.getByRole('button', { name: 'Registrar reporte de merma' }))

    expect(await screen.findByText('Reporte registrado localmente.')).toBeInTheDocument()
    expect(
      screen.getByRole<HTMLSelectElement>('combobox', { name: /Tipo de artículo 1/ })
        .value,
    ).toBe('')
  })

  it('disables the submit button and form controls while isSubmitting is true', () => {
    render(<EventClosureWasteForm onSubmit={vi.fn()} isSubmitting />)

    expect(
      screen.getByRole('button', { name: /Registrar reporte de merma/ }),
    ).toBeDisabled()
    expect(screen.getByRole('combobox', { name: /Tipo de artículo 1/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Agregar artículo' })).toBeDisabled()
  })
})
