import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { EventEditForm } from '@/features/events/components/EventEditForm'
import type { EventDetailViewModel } from '@/features/events/types/event'

/**
 * This form's own tests exercise field editability/submission, not the
 * geofence preview's map behavior (see `EventGeofenceMapPreview.test.tsx`
 * for that) — stubbed here purely so a resolved salón doesn't pull in real
 * `mapbox-gl` (unsafe/unsupported under jsdom), same reasoning as
 * `SalonLocationPicker.test.tsx`'s own stub.
 */
vi.mock('@/shared/components/ui/mapbox-map', () => ({
  MapboxMap: () => <div data-testid="mapbox-map-stub" />,
}))

const BORRADOR_EVENTO: EventDetailViewModel = {
  idEvento: 1001,
  idSalon: 1,
  titulo: 'Boda García',
  tipo: 'social',
  estado: 'borrador',
  fecha: '2026-09-12',
  horaPresentacion: '16:00',
  inicio: '2026-09-12T18:00:00',
  cupoMeseros: 12,
  numMesas: 20,
  tarifaPorMesero: 450,
  radioGeocercaM: 150,
}

const BORRADOR_EVENTO_CON_SALON: EventDetailViewModel = {
  ...BORRADOR_EVENTO,
  salonNombre: 'Salón Roble',
  salonLatitud: 25.5428,
  salonLongitud: -103.4068,
}

const PUBLICADO_EVENTO: EventDetailViewModel = { ...BORRADOR_EVENTO, estado: 'publicado' }

describe('EventEditForm', () => {
  it('pre-fills every field from the current event', () => {
    render(
      <EventEditForm evento={BORRADOR_EVENTO} onSubmit={vi.fn()} onCancel={vi.fn()} />,
    )

    expect(screen.getByLabelText(/^Título/)).toHaveValue('Boda García')
    expect(screen.getByLabelText(/^Número de mesas/)).toHaveValue(20)
    expect(screen.getByLabelText(/^Cupo de meseros/)).toHaveValue(12)
    expect(screen.getByLabelText(/^Tarifa por mesero/)).toHaveValue(450)
    expect(screen.getByLabelText(/^Radio permitido para registrar llegada/)).toHaveValue(
      150,
    )
  })

  it('leaves radio_geocerca_m editable while the event is in borrador', () => {
    render(
      <EventEditForm evento={BORRADOR_EVENTO} onSubmit={vi.fn()} onCancel={vi.fn()} />,
    )

    expect(screen.getByLabelText(/^Radio permitido para registrar llegada/)).toBeEnabled()
  })

  it('disables radio_geocerca_m once the event is no longer borrador — a real SGEB-4013 restriction', () => {
    render(
      <EventEditForm evento={PUBLICADO_EVENTO} onSubmit={vi.fn()} onCancel={vi.fn()} />,
    )

    expect(
      screen.getByLabelText(/^Radio permitido para registrar llegada/),
    ).toBeDisabled()
    expect(
      screen.getByText(/Solo editable mientras el evento está en borrador/),
    ).toBeInTheDocument()
  })

  it('submits with the edited values', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <EventEditForm evento={BORRADOR_EVENTO} onSubmit={onSubmit} onCancel={vi.fn()} />,
    )

    await user.clear(screen.getByLabelText(/^Título/))
    await user.type(screen.getByLabelText(/^Título/), 'Título actualizado')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ titulo: 'Título actualizado' }),
    )
  })

  it('calls onCancel when "Cancelar" is clicked, without submitting', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const onCancel = vi.fn()
    render(
      <EventEditForm evento={BORRADOR_EVENTO} onSubmit={onSubmit} onCancel={onCancel} />,
    )

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onCancel).toHaveBeenCalledOnce()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows the given safe error message', () => {
    render(
      <EventEditForm
        evento={BORRADOR_EVENTO}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
        errorMessage="El evento no admite esta operación en su estado actual."
      />,
    )
    expect(
      screen.getByText('El evento no admite esta operación en su estado actual.'),
    ).toBeInTheDocument()
  })

  it('shows the geofence empty state when the salón location cannot be resolved', () => {
    render(
      <EventEditForm evento={BORRADOR_EVENTO} onSubmit={vi.fn()} onCancel={vi.fn()} />,
    )

    expect(
      screen.getByText(
        'No pudimos obtener la ubicación del salón para mostrar la vista previa.',
      ),
    ).toBeInTheDocument()
  })

  it('shows the real map preview once the salón location is resolved, without exposing an editable location field', async () => {
    render(
      <EventEditForm
        evento={BORRADOR_EVENTO_CON_SALON}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(await screen.findByTestId('mapbox-map-stub')).toBeInTheDocument()
    expect(screen.queryByLabelText(/^Latitud/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/^Longitud/)).not.toBeInTheDocument()
  })

  it('does not render salón, fecha, hora de presentación, or inicio fields — not part of PUT /eventos/{id}', () => {
    render(
      <EventEditForm evento={BORRADOR_EVENTO} onSubmit={vi.fn()} onCancel={vi.fn()} />,
    )

    expect(screen.queryByLabelText(/^Salón/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/^Fecha del evento/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/^Hora de presentación/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/^Fecha y hora de inicio/)).not.toBeInTheDocument()
  })
})
