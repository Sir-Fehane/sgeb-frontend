import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { MapboxMap } from '@/shared/components/ui/mapbox-map'

interface FakeEventPayload {
  lngLat?: { lng: number; lat: number }
  error?: { message: string }
}

const { FakeMap, FakeMarker, FakeNavigationControl, mapInstances, markerInstances } =
  vi.hoisted(() => {
    const mapInstances: InstanceType<typeof FakeMapClass>[] = []
    const markerInstances: InstanceType<typeof FakeMarkerClass>[] = []

    class FakeMarkerClass {
      lngLat: { lng: number; lat: number } = { lng: 0, lat: 0 }
      draggable: boolean
      listeners: Record<string, (() => void)[]> = {}

      constructor(options: { draggable?: boolean } = {}) {
        this.draggable = options.draggable ?? false
        markerInstances.push(this)
      }
      setLngLat([lng, lat]: [number, number]) {
        this.lngLat = { lng, lat }
        return this
      }
      getLngLat() {
        return this.lngLat
      }
      addTo() {
        return this
      }
      on(event: string, handler: () => void) {
        ;(this.listeners[event] ??= []).push(handler)
        return this
      }
      remove() {
        return this
      }
      isDraggable() {
        return this.draggable
      }
      setDraggable(value: boolean) {
        this.draggable = value
      }
      emit(event: string) {
        this.listeners[event]?.forEach((handler) => {
          handler()
        })
      }
    }

    class FakeMapClass {
      options: Record<string, unknown>
      listeners: Record<string, ((payload: FakeEventPayload) => void)[]> = {}
      flyToCalls: unknown[] = []
      fitBoundsCalls: unknown[] = []
      removed = false

      constructor(options: Record<string, unknown>) {
        this.options = options
        mapInstances.push(this)
      }
      addControl() {
        return this
      }
      on(event: string, handler: (payload: FakeEventPayload) => void) {
        ;(this.listeners[event] ??= []).push(handler)
        return this
      }
      flyTo(options: unknown) {
        this.flyToCalls.push(options)
      }
      fitBounds(bounds: unknown, options: unknown) {
        this.fitBoundsCalls.push({ bounds, options })
      }
      remove() {
        this.removed = true
      }
      emit(event: string, payload: FakeEventPayload = {}) {
        this.listeners[event]?.forEach((handler) => {
          handler(payload)
        })
      }
    }

    class FakeNavigationControlClass {}

    return {
      FakeMap: FakeMapClass,
      FakeMarker: FakeMarkerClass,
      FakeNavigationControl: FakeNavigationControlClass,
      mapInstances,
      markerInstances,
    }
  })

vi.mock('mapbox-gl', () => ({
  default: {
    Map: FakeMap,
    Marker: FakeMarker,
    NavigationControl: FakeNavigationControl,
    accessToken: '',
  },
}))

function getLastMap() {
  const map = mapInstances[mapInstances.length - 1]
  if (!map) {
    throw new Error('No map instance was created')
  }
  return map
}

function getLastMarker() {
  const marker = markerInstances[markerInstances.length - 1]
  if (!marker) {
    throw new Error('No marker instance was created')
  }
  return marker
}

describe('MapboxMap', () => {
  it('initializes the map with the given center and zoom, and a navigation control', () => {
    render(
      <MapboxMap accessToken="pk.token" center={{ lat: 19.4, lng: -99.1 }} zoom={12} />,
    )

    expect(getLastMap().options).toMatchObject({ center: [-99.1, 19.4], zoom: 12 })
  })

  it('renders no marker when the marker prop is omitted', () => {
    render(<MapboxMap accessToken="pk.token" center={{ lat: 19.4, lng: -99.1 }} />)

    expect(markerInstances).toHaveLength(0)
  })

  it('creates a draggable marker at the given position when marker is provided', () => {
    render(
      <MapboxMap
        accessToken="pk.token"
        center={{ lat: 19.4, lng: -99.1 }}
        marker={{ lat: 19.4, lng: -99.1, draggable: true }}
      />,
    )

    const marker = getLastMarker()
    expect(marker.lngLat).toEqual({ lng: -99.1, lat: 19.4 })
    expect(marker.draggable).toBe(true)
  })

  it('calls onMarkerDragEnd with the marker position after a drag', () => {
    const onMarkerDragEnd = vi.fn()
    render(
      <MapboxMap
        accessToken="pk.token"
        center={{ lat: 19.4, lng: -99.1 }}
        marker={{ lat: 19.4, lng: -99.1, draggable: true }}
        onMarkerDragEnd={onMarkerDragEnd}
      />,
    )

    const marker = getLastMarker()
    marker.setLngLat([-99.2, 19.5])
    marker.emit('dragend')

    expect(onMarkerDragEnd).toHaveBeenCalledWith({ lng: -99.2, lat: 19.5 })
  })

  it('calls onMapClick with the clicked position', () => {
    const onMapClick = vi.fn()
    render(
      <MapboxMap
        accessToken="pk.token"
        center={{ lat: 19.4, lng: -99.1 }}
        onMapClick={onMapClick}
      />,
    )

    getLastMap().emit('click', { lngLat: { lng: -99.3, lat: 19.6 } })

    expect(onMapClick).toHaveBeenCalledWith({ lng: -99.3, lat: 19.6 })
  })

  it('surfaces a mapbox-gl error through onError', () => {
    const onError = vi.fn()
    render(
      <MapboxMap
        accessToken="pk.token"
        center={{ lat: 19.4, lng: -99.1 }}
        onError={onError}
      />,
    )

    getLastMap().emit('error', { error: { message: 'estilo no disponible' } })

    expect(onError).toHaveBeenCalledWith('estilo no disponible')
  })

  it('flies to a new center instead of recreating the map when center changes', () => {
    const { rerender } = render(
      <MapboxMap accessToken="pk.token" center={{ lat: 19.4, lng: -99.1 }} />,
    )
    const initialInstanceCount = mapInstances.length

    rerender(<MapboxMap accessToken="pk.token" center={{ lat: 20, lng: -100 }} />)

    expect(mapInstances).toHaveLength(initialInstanceCount)
    expect(getLastMap().flyToCalls).toContainEqual({ center: [-100, 20], zoom: 15 })
  })

  it('exposes an accessible, labeled container', () => {
    render(
      <MapboxMap
        accessToken="pk.token"
        center={{ lat: 19.4, lng: -99.1 }}
        ariaLabel="Mapa del salón"
      />,
    )

    expect(
      screen.getByRole('application', { name: 'Mapa del salón' }),
    ).toBeInTheDocument()
  })

  it('calls onMapReady with the map instance once the style has loaded', () => {
    const onMapReady = vi.fn()
    render(
      <MapboxMap
        accessToken="pk.token"
        center={{ lat: 19.4, lng: -99.1 }}
        onMapReady={onMapReady}
      />,
    )

    expect(onMapReady).not.toHaveBeenCalled()

    const map = getLastMap()
    map.emit('load')

    expect(onMapReady).toHaveBeenCalledWith(map)
  })

  it('fits bounds instead of flying to center/zoom when bounds is given', () => {
    render(
      <MapboxMap
        accessToken="pk.token"
        center={{ lat: 19.4, lng: -99.1 }}
        bounds={{ sw: { lat: 19.3, lng: -99.2 }, ne: { lat: 19.5, lng: -99.0 } }}
      />,
    )

    const map = getLastMap()
    expect(map.fitBoundsCalls).toContainEqual({
      bounds: [
        [-99.2, 19.3],
        [-99.0, 19.5],
      ],
      options: { padding: 40 },
    })
    expect(map.flyToCalls).toHaveLength(0)
  })

  it('re-fits bounds when the bounds prop changes, using the given padding', () => {
    const { rerender } = render(
      <MapboxMap
        accessToken="pk.token"
        center={{ lat: 19.4, lng: -99.1 }}
        bounds={{ sw: { lat: 19.3, lng: -99.2 }, ne: { lat: 19.5, lng: -99.0 } }}
      />,
    )
    const initialInstanceCount = mapInstances.length

    rerender(
      <MapboxMap
        accessToken="pk.token"
        center={{ lat: 19.4, lng: -99.1 }}
        bounds={{
          sw: { lat: 19.35, lng: -99.15 },
          ne: { lat: 19.45, lng: -99.05 },
          padding: 64,
        }}
      />,
    )

    expect(mapInstances).toHaveLength(initialInstanceCount)
    expect(getLastMap().fitBoundsCalls).toContainEqual({
      bounds: [
        [-99.15, 19.35],
        [-99.05, 19.45],
      ],
      options: { padding: 64 },
    })
  })
})
