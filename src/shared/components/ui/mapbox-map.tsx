import mapboxgl from 'mapbox-gl'
import { useEffect, useRef } from 'react'

import { cn } from '@/shared/utils/cn'

import 'mapbox-gl/dist/mapbox-gl.css'

export interface MapboxLngLat {
  lng: number
  lat: number
}

export interface MapboxMapMarker extends MapboxLngLat {
  draggable?: boolean
}

const DEFAULT_ZOOM = 15
const DEFAULT_STYLE = 'mapbox://styles/mapbox/streets-v12'

export interface MapboxMapProps {
  /** Public (browser-safe) Mapbox access token — never a secret token. */
  accessToken: string
  /** Camera center. Only applied on mount and when it changes from the outside (e.g. after a geocoding result) — dragging the map itself never feeds back into this prop. */
  center: MapboxLngLat
  zoom?: number
  /** Renders a single marker, or none when omitted — this primitive never manages a marker list. */
  marker?: MapboxMapMarker | undefined
  /** Fires while dragging the marker completes — the caller owns the resulting coordinates (e.g. writing them into a form field); this component never stores them itself. */
  onMarkerDragEnd?: ((position: MapboxLngLat) => void) | undefined
  /** Fires on a genuine map click (never on a pan/drag gesture) — lets the caller move the marker to the clicked point. */
  onMapClick?: ((position: MapboxLngLat) => void) | undefined
  /** Fires when the underlying `mapbox-gl` map reports an error (e.g. an invalid token or a failed style/tile load). */
  onError?: ((message: string) => void) | undefined
  className?: string
  ariaLabel?: string
}

/**
 * Thin, reusable wrapper around a single `mapbox-gl` `Map` instance —
 * imperative by design (mapbox-gl owns the canvas, React only owns the
 * container `div`) so this stays a clean provider boundary: every feature
 * that needs a map talks to this component's props/callbacks, never to
 * `mapbox-gl` directly. Deliberately minimal — no geocoding, no form
 * wiring, no styling opinions beyond the container — so it can be reused
 * for a future Event geofence visualization (center + circle) without
 * having been built Salón-specific.
 *
 * Deliberately NOT re-exported from `shared/components/index.ts`'s public
 * barrel, unlike every other primitive there: `mapbox-gl` is a ~500 KB
 * (gzipped) dependency, and that barrel is statically imported by nearly
 * every page in the app. Re-exporting this from it once measurably grew
 * the shared eager chunk from ~160 KB to ~2 MB (confirmed via a baseline
 * build during this component's own PR) — every route would pay for
 * `mapbox-gl` even though only the Salón location picker uses it today.
 * Import this module directly (`@/shared/components/ui/mapbox-map`) and,
 * like `SalonLocationPicker` does, load it through `React.lazy` so it
 * becomes its own on-demand chunk instead of inflating whichever chunk
 * statically imports it.
 */
export function MapboxMap({
  accessToken,
  center,
  zoom = DEFAULT_ZOOM,
  marker,
  onMarkerDragEnd,
  onMapClick,
  onError,
  className,
  ariaLabel = 'Mapa de ubicación',
}: MapboxMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const onMarkerDragEndRef = useRef(onMarkerDragEnd)
  const onMapClickRef = useRef(onMapClick)
  const onErrorRef = useRef(onError)

  // Refs must never be written during render (React Compiler's
  // `react-hooks/refs` rule) — keep them at the latest callback via an
  // effect instead, so the mount-once effect below never needs
  // `onMarkerDragEnd`/`onMapClick`/`onError` in its own dependency array.
  useEffect(() => {
    onMarkerDragEndRef.current = onMarkerDragEnd
    onMapClickRef.current = onMapClick
    onErrorRef.current = onError
  })

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    mapboxgl.accessToken = accessToken
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: DEFAULT_STYLE,
      center: [center.lng, center.lat],
      zoom,
    })
    map.addControl(new mapboxgl.NavigationControl(), 'top-right')
    map.on('error', (event) => {
      onErrorRef.current?.(event.error?.message ?? 'No se pudo cargar el mapa.')
    })
    map.on('click', (event) => {
      onMapClickRef.current?.({ lng: event.lngLat.lng, lat: event.lngLat.lat })
    })
    mapRef.current = map

    return () => {
      markerRef.current?.remove()
      markerRef.current = null
      map.remove()
      mapRef.current = null
    }
    // Intentionally mount/unmount once: `center`/`zoom` are the *initial*
    // camera only (see the effect below for how a later change is
    // applied), and `accessToken` never changes without a full reload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) {
      return
    }
    map.flyTo({ center: [center.lng, center.lat], zoom })
  }, [center.lng, center.lat, zoom])

  const markerLat = marker?.lat
  const markerLng = marker?.lng
  const markerDraggable = marker?.draggable ?? false

  useEffect(() => {
    const map = mapRef.current
    if (!map) {
      return
    }

    if (markerLat === undefined || markerLng === undefined) {
      markerRef.current?.remove()
      markerRef.current = null
      return
    }

    if (!markerRef.current) {
      const mapboxMarker = new mapboxgl.Marker({ draggable: markerDraggable })
        .setLngLat([markerLng, markerLat])
        .addTo(map)
      mapboxMarker.on('dragend', () => {
        const lngLat = mapboxMarker.getLngLat()
        onMarkerDragEndRef.current?.({ lng: lngLat.lng, lat: lngLat.lat })
      })
      markerRef.current = mapboxMarker
      return
    }

    markerRef.current.setLngLat([markerLng, markerLat])
    if (markerRef.current.isDraggable() !== markerDraggable) {
      markerRef.current.setDraggable(markerDraggable)
    }
  }, [markerLat, markerLng, markerDraggable])

  return (
    <div
      ref={containerRef}
      role="application"
      aria-label={ariaLabel}
      className={cn('h-64 w-full overflow-hidden rounded-lg sm:h-80', className)}
    />
  )
}
