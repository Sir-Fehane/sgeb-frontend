import { act, render, screen, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { EventGeofenceMapPreview } from '@/features/events/components/EventGeofenceMapPreview'
import type { MapboxMapProps } from '@/shared/components/ui/mapbox-map'

const GEOFENCE_SOURCE_ID = 'event-geofence-circle'

const { fakeMap, resetFakeMap } = vi.hoisted(() => {
  const sources = new Map<string, { data: unknown }>()
  const layers: { id: string; type: string }[] = []
  const fitBoundsCalls: unknown[] = []
  const fakeMap = {
    getSource(id: string) {
      const entry = sources.get(id)
      if (!entry) {
        return undefined
      }
      return {
        setData: (data: unknown) => {
          entry.data = data
        },
      }
    },
    addSource(id: string, spec: { data: unknown }) {
      sources.set(id, { data: spec.data })
    },
    addLayer(layer: { id: string; type: string }) {
      layers.push({ id: layer.id, type: layer.type })
    },
    fitBounds(bounds: unknown, options: unknown) {
      fitBoundsCalls.push({ bounds, options })
    },
    sourceData(id: string) {
      return sources.get(id)?.data
    },
    layers,
    fitBoundsCalls,
  }
  return {
    fakeMap,
    resetFakeMap: () => {
      sources.clear()
      layers.length = 0
      fitBoundsCalls.length = 0
    },
  }
})

vi.mock('@/shared/components/ui/mapbox-map', () => ({
  MapboxMap: (props: MapboxMapProps) => {
    useEffect(() => {
      props.onMapReady?.(fakeMap as never)
      // Only ever fire once per mount — mirrors the real `mapbox-gl` 'load'
      // event, which fires exactly once per `Map` instance.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
      <div data-testid="mapbox-map-stub">
        <span data-testid="map-aria-label">{props.ariaLabel}</span>
        <span data-testid="map-center">{`${String(props.center.lat)},${String(props.center.lng)}`}</span>
        {props.marker ? (
          <span
            data-testid="map-marker"
            data-draggable={String(props.marker.draggable ?? false)}
          >
            {`${String(props.marker.lat)},${String(props.marker.lng)}`}
          </span>
        ) : null}
        <span data-testid="map-has-click-handler">
          {String(Boolean(props.onMapClick))}
        </span>
        <span data-testid="map-has-drag-handler">
          {String(Boolean(props.onMarkerDragEnd))}
        </span>
        {props.bounds ? (
          <span data-testid="map-bounds">{JSON.stringify(props.bounds)}</span>
        ) : null}
        <button type="button" onClick={() => props.onError?.('mapbox error')}>
          simulate-error
        </button>
      </div>
    )
  },
}))

beforeEach(() => {
  resetFakeMap()
})

afterEach(() => {
  vi.useRealTimers()
})

const SALON = { nombre: 'Salón Roble', lat: 19.4, lng: -99.1 }

describe('EventGeofenceMapPreview — no salón / invalid coordinates', () => {
  it('shows a compact empty state instead of a broken map when salon is null', () => {
    render(<EventGeofenceMapPreview salon={null} radiusMeters={150} />)

    expect(
      screen.getByText('Selecciona un salón para ver la vista previa de la geocerca.'),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('mapbox-map-stub')).not.toBeInTheDocument()
  })

  it('shows a caller-supplied empty message instead of the default', () => {
    render(
      <EventGeofenceMapPreview
        salon={null}
        radiusMeters={150}
        emptyStateMessage="No pudimos obtener la ubicación del salón."
      />,
    )

    expect(
      screen.getByText('No pudimos obtener la ubicación del salón.'),
    ).toBeInTheDocument()
  })

  it('shows the empty state when salon coordinates are non-finite', () => {
    render(
      <EventGeofenceMapPreview
        salon={{ nombre: 'Salón Roble', lat: Number.NaN, lng: -99.1 }}
        radiusMeters={150}
      />,
    )

    expect(screen.queryByTestId('mapbox-map-stub')).not.toBeInTheDocument()
  })
})

describe('EventGeofenceMapPreview — map preview', () => {
  it('centers the map on the salón coordinates', async () => {
    render(<EventGeofenceMapPreview salon={SALON} radiusMeters={150} />)

    expect(await screen.findByTestId('map-center')).toHaveTextContent('19.4,-99.1')
  })

  it('renders a non-draggable marker at the salón coordinates', async () => {
    render(<EventGeofenceMapPreview salon={SALON} radiusMeters={150} />)

    const marker = await screen.findByTestId('map-marker')
    expect(marker).toHaveTextContent('19.4,-99.1')
    expect(marker).toHaveAttribute('data-draggable', 'false')
  })

  it('never wires onMapClick/onMarkerDragEnd — a preview must never mutate salón coordinates', async () => {
    render(<EventGeofenceMapPreview salon={SALON} radiusMeters={150} />)

    expect(await screen.findByTestId('map-has-click-handler')).toHaveTextContent('false')
    expect(screen.getByTestId('map-has-drag-handler')).toHaveTextContent('false')
  })

  it('labels the map with the salón name when available', async () => {
    render(<EventGeofenceMapPreview salon={SALON} radiusMeters={150} />)

    expect(await screen.findByTestId('map-aria-label')).toHaveTextContent(
      'Vista previa de la geocerca en Salón Roble',
    )
  })

  it('falls back to a generic label when the salón has no name', async () => {
    render(
      <EventGeofenceMapPreview salon={{ lat: 19.4, lng: -99.1 }} radiusMeters={150} />,
    )

    expect(await screen.findByTestId('map-aria-label')).toHaveTextContent(
      'Vista previa de la geocerca del salón',
    )
  })

  it('adds a GeoJSON source and fill/line layers once the map is ready', async () => {
    render(<EventGeofenceMapPreview salon={SALON} radiusMeters={150} />)

    await screen.findByTestId('mapbox-map-stub')
    await waitFor(() => {
      expect(fakeMap.sourceData(GEOFENCE_SOURCE_ID)).toBeDefined()
    })
    expect(fakeMap.layers.map((layer) => layer.type).sort()).toEqual(['fill', 'line'])
  })

  it('fits bounds around the geofence circle as soon as it resolves', async () => {
    render(<EventGeofenceMapPreview salon={SALON} radiusMeters={150} />)

    const bounds = await screen.findByTestId('map-bounds')
    const parsed = JSON.parse(bounds.textContent ?? '{}') as {
      sw: { lat: number; lng: number }
      ne: { lat: number; lng: number }
    }
    expect(parsed.sw.lat).toBeLessThan(SALON.lat)
    expect(parsed.ne.lat).toBeGreaterThan(SALON.lat)
  })

  it('does not render a circle overlay for an invalid radius, but still shows the map', async () => {
    render(<EventGeofenceMapPreview salon={SALON} radiusMeters={Number.NaN} />)

    await screen.findByTestId('mapbox-map-stub')
    await waitFor(() => {
      expect(fakeMap.sourceData(GEOFENCE_SOURCE_ID)).toEqual({
        type: 'FeatureCollection',
        features: [],
      })
    })
    expect(screen.queryByTestId('map-bounds')).not.toBeInTheDocument()
  })

  it('updates the circle data when radiusMeters changes, without recreating the map', async () => {
    const { rerender } = render(
      <EventGeofenceMapPreview salon={SALON} radiusMeters={150} />,
    )
    await screen.findByTestId('mapbox-map-stub')
    await waitFor(() => {
      expect(fakeMap.sourceData(GEOFENCE_SOURCE_ID)).toBeDefined()
    })
    const dataAt150 = fakeMap.sourceData(GEOFENCE_SOURCE_ID)

    rerender(<EventGeofenceMapPreview salon={SALON} radiusMeters={500} />)

    await waitFor(() => {
      expect(fakeMap.sourceData(GEOFENCE_SOURCE_ID)).not.toEqual(dataAt150)
    })
    expect(screen.getAllByTestId('mapbox-map-stub')).toHaveLength(1)
  })

  it('debounces the camera bounds re-fit for rapid radius changes after the first fit', async () => {
    vi.useFakeTimers()
    const { rerender } = render(
      <EventGeofenceMapPreview salon={SALON} radiusMeters={150} />,
    )
    // The very first fit commits on the next tick (not the full debounce) —
    // flush it before capturing the baseline.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    const firstBounds = screen.getByTestId('map-bounds').textContent

    rerender(<EventGeofenceMapPreview salon={SALON} radiusMeters={900} />)
    // Immediately after the prop change, the camera has not moved yet.
    expect(screen.getByTestId('map-bounds').textContent).toBe(firstBounds)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })

    expect(screen.getByTestId('map-bounds').textContent).not.toBe(firstBounds)
  })

  it('changing salón updates the map center', async () => {
    const { rerender } = render(
      <EventGeofenceMapPreview salon={SALON} radiusMeters={150} />,
    )
    await screen.findByTestId('map-center')

    rerender(
      <EventGeofenceMapPreview
        salon={{ nombre: 'Salón Alameda', lat: 20.9, lng: -89.6 }}
        radiusMeters={150}
      />,
    )

    expect(screen.getByTestId('map-center')).toHaveTextContent('20.9,-89.6')
  })
})

describe('EventGeofenceMapPreview — recenter control', () => {
  it('renders an accessible "Centrar en salón" control once the map is ready', async () => {
    render(<EventGeofenceMapPreview salon={SALON} radiusMeters={150} />)

    expect(
      await screen.findByRole('button', { name: 'Centrar en salón' }),
    ).toBeInTheDocument()
  })

  it('does not render the recenter control when there is no valid circle to fit', async () => {
    render(<EventGeofenceMapPreview salon={SALON} radiusMeters={Number.NaN} />)

    await screen.findByTestId('mapbox-map-stub')
    expect(
      screen.queryByRole('button', { name: 'Centrar en salón' }),
    ).not.toBeInTheDocument()
  })

  it('calls fitBounds with the same bounds/padding strategy as the initial preview, without mutating salón/radius', async () => {
    render(<EventGeofenceMapPreview salon={SALON} radiusMeters={150} />)

    const recenterButton = await screen.findByRole('button', {
      name: 'Centrar en salón',
    })
    fakeMap.fitBoundsCalls.length = 0

    recenterButton.click()

    expect(fakeMap.fitBoundsCalls).toHaveLength(1)
    const [call] = fakeMap.fitBoundsCalls as [
      { bounds: number[][]; options: { padding: number } },
    ]
    expect(call.options.padding).toBe(56)
    // The recentered bounds still surround the salón's exact coordinates.
    expect(call.bounds[0]![1]).toBeLessThan(SALON.lat)
    expect(call.bounds[1]![1]).toBeGreaterThan(SALON.lat)
  })

  it('works after the map has been panned/zoomed — it always re-fits, regardless of current camera state', async () => {
    render(<EventGeofenceMapPreview salon={SALON} radiusMeters={150} />)

    const recenterButton = await screen.findByRole('button', {
      name: 'Centrar en salón',
    })
    // Simulate the user having panned away — the fake map has no real
    // camera state to move, so this just proves the click still succeeds
    // and re-invokes fitBounds independent of any prior camera calls.
    recenterButton.click()
    recenterButton.click()

    expect(fakeMap.fitBoundsCalls.length).toBeGreaterThanOrEqual(2)
  })

  it('never recreates the map — clicking recenter does not remount MapboxMap', async () => {
    render(<EventGeofenceMapPreview salon={SALON} radiusMeters={150} />)

    const recenterButton = await screen.findByRole('button', {
      name: 'Centrar en salón',
    })
    recenterButton.click()

    expect(screen.getAllByTestId('mapbox-map-stub')).toHaveLength(1)
  })
})

describe('EventGeofenceMapPreview — map errors', () => {
  it('shows a retry alert when the map reports an error, and keeps the numeric radius unaffected', async () => {
    render(<EventGeofenceMapPreview salon={SALON} radiusMeters={150} />)

    const errorButton = await screen.findByText('simulate-error')
    errorButton.click()

    expect(await screen.findByText('No se pudo cargar el mapa')).toBeInTheDocument()
    expect(screen.getByText('mapbox error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
  })

  it('re-renders the map after clicking "Reintentar"', async () => {
    render(<EventGeofenceMapPreview salon={SALON} radiusMeters={150} />)

    ;(await screen.findByText('simulate-error')).click()
    expect(await screen.findByText('No se pudo cargar el mapa')).toBeInTheDocument()

    screen.getByRole('button', { name: 'Reintentar' }).click()

    expect(await screen.findByTestId('mapbox-map-stub')).toBeInTheDocument()
    expect(screen.queryByText('No se pudo cargar el mapa')).not.toBeInTheDocument()
  })
})
