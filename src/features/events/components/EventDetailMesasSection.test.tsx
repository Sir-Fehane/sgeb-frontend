import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { EventDetailMesasSection } from '@/features/events/components/EventDetailMesasSection'
import type { MesaViewModel } from '@/features/events/services/mesasApi'

const MESA: MesaViewModel = {
  idMesa: 501,
  etiqueta: 'Mesa 1',
  estado: 'libre',
  codigoQr: '3f2a9c14-1234-4abc-89ab-000000000000',
}

describe('EventDetailMesasSection', () => {
  it('shows the loading state', () => {
    render(
      <EventDetailMesasSection
        mesas={[]}
        isLoading
        canManage={false}
        onCreateMesa={vi.fn()}
        isCreating={false}
      />,
    )
    expect(screen.getByText('Cargando mesas…')).toBeInTheDocument()
  })

  it('shows a real error, not the empty state', () => {
    render(
      <EventDetailMesasSection
        mesas={[]}
        isLoading={false}
        errorMessage="No pudimos comunicarnos con el servidor."
        canManage={false}
        onCreateMesa={vi.fn()}
        isCreating={false}
      />,
    )
    expect(
      screen.getByText('No pudimos comunicarnos con el servidor.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Este evento aún no tiene mesas registradas.'),
    ).not.toBeInTheDocument()
  })

  it('shows the empty state when there are no mesas and no error', () => {
    render(
      <EventDetailMesasSection
        mesas={[]}
        isLoading={false}
        canManage={false}
        onCreateMesa={vi.fn()}
        isCreating={false}
      />,
    )
    expect(
      screen.getByText('Este evento aún no tiene mesas registradas.'),
    ).toBeInTheDocument()
  })

  it('lists each mesa with its etiqueta and estado — never a raw codigo_qr', () => {
    render(
      <EventDetailMesasSection
        mesas={[MESA]}
        isLoading={false}
        canManage={false}
        onCreateMesa={vi.fn()}
        isCreating={false}
      />,
    )
    expect(screen.getByText('Mesa 1')).toBeInTheDocument()
    expect(screen.getByText('Libre')).toBeInTheDocument()
    expect(screen.queryByText(MESA.codigoQr)).not.toBeInTheDocument()
  })

  it('never exposes an NFC UID field — reserved/unused, QR is the live linking mechanism', () => {
    render(
      <EventDetailMesasSection
        mesas={[]}
        isLoading={false}
        canManage
        onCreateMesa={vi.fn()}
        isCreating={false}
      />,
    )
    expect(screen.queryByText(/NFC/i)).not.toBeInTheDocument()
  })

  it('hides the "Agregar mesa" form for a non-managing session', () => {
    render(
      <EventDetailMesasSection
        mesas={[]}
        isLoading={false}
        canManage={false}
        onCreateMesa={vi.fn()}
        isCreating={false}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Agregar mesa' })).not.toBeInTheDocument()
  })

  it('submits onCreateMesa with the entered etiqueta, and resets the field on success', async () => {
    const user = userEvent.setup()
    const onCreateMesa = vi.fn().mockResolvedValue(undefined)
    render(
      <EventDetailMesasSection
        mesas={[]}
        isLoading={false}
        canManage
        onCreateMesa={onCreateMesa}
        isCreating={false}
      />,
    )

    await user.type(screen.getByLabelText(/^Etiqueta/), 'Mesa 2')
    await user.click(screen.getByRole('button', { name: 'Agregar mesa' }))

    expect(onCreateMesa).toHaveBeenCalledWith({ etiqueta: 'Mesa 2' })
  })

  it('rejects an empty etiqueta without calling onCreateMesa', async () => {
    const user = userEvent.setup()
    const onCreateMesa = vi.fn()
    render(
      <EventDetailMesasSection
        mesas={[]}
        isLoading={false}
        canManage
        onCreateMesa={onCreateMesa}
        isCreating={false}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Agregar mesa' }))

    expect(
      await screen.findByText('Ingresa una etiqueta para la mesa.'),
    ).toBeInTheDocument()
    expect(onCreateMesa).not.toHaveBeenCalled()
  })

  it('shows a safe creation error when supplied', () => {
    render(
      <EventDetailMesasSection
        mesas={[]}
        isLoading={false}
        canManage
        onCreateMesa={vi.fn()}
        isCreating={false}
        createErrorMessage="La etiqueta ya está en uso en este evento."
      />,
    )
    expect(
      screen.getByText('La etiqueta ya está en uso en este evento.'),
    ).toBeInTheDocument()
  })
})
