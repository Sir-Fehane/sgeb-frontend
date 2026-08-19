import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { EventDetailGeofenceSection } from '@/features/events/components/EventDetailGeofenceSection'
import type { EventDetailViewModel } from '@/features/events/types/event'

vi.mock('@/shared/components/ui/mapbox-map', () => ({
  MapboxMap: () => <div data-testid="mapbox-map-stub" />,
}))

const EVENTO: EventDetailViewModel = {
  idEvento: 1001,
  idSalon: 1,
  titulo: 'Boda García',
  tipo: 'social',
  estado: 'publicado',
  fecha: '2026-09-12',
  horaPresentacion: '16:00',
  inicio: '2026-09-12T18:00:00',
  cupoMeseros: 12,
  numMesas: 20,
  tarifaPorMesero: 450,
  radioGeocercaM: 150,
}

describe('EventDetailGeofenceSection', () => {
  it('renders the "Zona de registro de llegada" heading', () => {
    render(<EventDetailGeofenceSection evento={EVENTO} />)

    expect(
      screen.getByRole('heading', { name: 'Zona de registro de llegada' }),
    ).toBeInTheDocument()
  })

  it('shows the empty/unresolved state when the salón location is not available', () => {
    render(<EventDetailGeofenceSection evento={EVENTO} />)

    expect(
      screen.getByText(
        'No pudimos obtener la ubicación del salón para mostrar la vista previa.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('mapbox-map-stub')).not.toBeInTheDocument()
  })

  it('renders the real read-only map once the salón location resolves', async () => {
    render(
      <EventDetailGeofenceSection
        evento={{
          ...EVENTO,
          salonNombre: 'Salón Roble',
          salonLatitud: 25.5428,
          salonLongitud: -103.4068,
        }}
      />,
    )

    expect(await screen.findByTestId('mapbox-map-stub')).toBeInTheDocument()
  })

  it('shows the salón name and address as compact text context', () => {
    render(
      <EventDetailGeofenceSection
        evento={{
          ...EVENTO,
          salonNombre: 'Salón Roble',
          salonLatitud: 25.5428,
          salonLongitud: -103.4068,
          salonAddress:
            'Blvd. Independencia 1234 · Col. Centro · Torreón, Coahuila · CP 27000',
        }}
      />,
    )

    expect(screen.getByText('Salón Roble')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Blvd. Independencia 1234 · Col. Centro · Torreón, Coahuila · CP 27000',
      ),
    ).toBeInTheDocument()
  })

  it('never repeats "Radio configurado" — radioGeocercaM already renders in EventDetailLogisticsSection elsewhere on the page', () => {
    render(
      <EventDetailGeofenceSection
        evento={{
          ...EVENTO,
          salonNombre: 'Salón Roble',
          salonLatitud: 25.5428,
          salonLongitud: -103.4068,
        }}
      />,
    )

    expect(screen.queryByText(/Radio configurado/)).not.toBeInTheDocument()
  })

  it('degrades safely when the address is unavailable — no "undefined", still shows the name', () => {
    render(
      <EventDetailGeofenceSection
        evento={{
          ...EVENTO,
          salonNombre: 'Salón Roble',
          salonLatitud: 25.5428,
          salonLongitud: -103.4068,
        }}
      />,
    )

    expect(screen.getByText('Salón Roble')).toBeInTheDocument()
    expect(screen.queryByText(/undefined/)).not.toBeInTheDocument()
  })

  it('renders no name/address context block at all when neither is available', () => {
    render(<EventDetailGeofenceSection evento={EVENTO} />)

    expect(screen.queryByText(/undefined/)).not.toBeInTheDocument()
  })
})
