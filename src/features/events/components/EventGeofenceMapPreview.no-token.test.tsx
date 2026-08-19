import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { EventGeofenceMapPreview } from '@/features/events/components/EventGeofenceMapPreview'

vi.mock('@/shared/config/env', () => ({
  env: {
    VITE_SGEB_API_URL: 'http://localhost:3333/v1',
    VITE_SSO_API_URL: 'http://localhost:3333',
    VITE_MAPBOX_ACCESS_TOKEN: undefined,
  },
}))

vi.mock('@/shared/components/ui/mapbox-map', () => ({
  MapboxMap: () => {
    throw new Error('MapboxMap must never render without a configured access token')
  },
}))

describe('EventGeofenceMapPreview without a configured Mapbox token', () => {
  it('shows a config-missing message instead of rendering the map, never blocking the caller', () => {
    render(
      <EventGeofenceMapPreview
        salon={{ nombre: 'Salón Roble', lat: 19.4, lng: -99.1 }}
        radiusMeters={150}
      />,
    )

    expect(screen.getByText('Vista previa no disponible')).toBeInTheDocument()
    expect(
      screen.getByText(
        'No pudimos mostrar el mapa en este momento. Puedes seguir configurando el radio normalmente.',
      ),
    ).toBeInTheDocument()
    // Never exposes internal configuration terminology to the user.
    expect(screen.queryByText(/configuración/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/VITE_MAPBOX/)).not.toBeInTheDocument()
  })
})
