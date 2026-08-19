import mapboxgl from 'mapbox-gl'
import { useEffect, useRef } from 'react'

import { cn } from '@/shared/utils/cn'
import { prefersReducedMotion } from '@/shared/utils/reducedMotion'

import 'mapbox-gl/dist/mapbox-gl.css'

export interface MapboxLngLat {
  lng: number
  lat: number
}

export interface MapboxMapMarker extends MapboxLngLat {
  draggable?: boolean
}

/** A camera viewport expressed as a box to fit, instead of a fixed center/zoom — see `MapboxMapProps.bounds`. */
export interface MapboxMapBounds {
  sw: MapboxLngLat
  ne: MapboxLngLat
  /** Pixels of padding kept between the box and the container edge. Defaults to 40. */
  padding?: number
}

const DEFAULT_ZOOM = 15
const DEFAULT_STYLE = 'mapbox://styles/mapbox/streets-v12'
const DEFAULT_BOUNDS_PADDING = 40

export interface MapboxMapProps {
  /** Public (browser-safe) Mapbox access token — never a secret token. */
  accessToken: string
  /** Camera center. Only applied on mount and when it changes from the outside (e.g. after a geocoding result) — dragging the map itself never feeds back into this prop. Ignored on updates whenever `bounds` is also given (see `bounds`). */
  center: MapboxLngLat
  zoom?: number
  /**
   * When given, the camera fits this box (`fitBounds`) instead of flying to
   * `center`/`zoom` — e.g. a geofence circle's full extent plus padding.
   * `center`/`zoom` still seed the map's *initial* camera on mount (before
   * this component's first render with a `bounds` value), so callers don't
   * need to compute an initial center AND initial bounds redundantly.
   */
  bounds?: MapboxMapBounds | undefined
  /** Renders a single marker, or none when omitted — this primitive never manages a marker list. */
  marker?: MapboxMapMarker | undefined
  /** Fires while dragging the marker completes — the caller owns the resulting coordinates (e.g. writing them into a form field); this component never stores them itself. */
  onMarkerDragEnd?: ((position: MapboxLngLat) => void) | undefined
  /** Fires on a genuine map click (never on a pan/drag gesture) — lets the caller move the marker to the clicked point. */
  onMapClick?: ((position: MapboxLngLat) => void) | undefined
  /** Fires when the underlying `mapbox-gl` map reports an error (e.g. an invalid token or a failed style/tile load). */
  onError?: ((message: string) => void) | undefined
  /**
   * Fires once, after the underlying `mapbox-gl` `Map`'s style has finished
   * loading, with the raw map instance — the escape hatch for a caller that
   * needs to manage its own GeoJSON source/layer (e.g. a geofence circle)
   * without this primitive knowing anything about circles itself. The
   * caller owns whatever it adds through this instance; this component
   * never reads it back, and removes the whole map (source/layers
   * included) on unmount.
   */
  onMapReady?: ((map: mapboxgl.Map) => void) | undefined
  className?: string
  ariaLabel?: string
}

/**
 * Thin, reusable wrapper around a single `mapbox-gl` `Map` instance —
 * imperative by design (mapbox-gl owns the canvas, React only owns the
 * container `div`) so this stays a clean provider boundary: every feature
 * that needs a map talks to this component's props/callbacks, never to
 * `mapbox-gl` directly. Deliberately minimal — no geocoding, no form
 * wiring, no styling opinions beyond the container, no GeoJSON/circle logic
 * of its own — so both `SalonLocationPicker` (marker placement) and
 * `EventGeofenceMapPreview` (read-only marker + geofence circle, via
 * `bounds`/`onMapReady`) sit on top of it without depending on each other.
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
  bounds,
  marker,
  onMarkerDragEnd,
  onMapClick,
  onError,
  onMapReady,
  className,
  ariaLabel = 'Mapa de ubicación',
}: MapboxMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRef = useRef<mapboxgl.Marker | null>(null)
  const onMarkerDragEndRef = useRef(onMarkerDragEnd)
  const onMapClickRef = useRef(onMapClick)
  const onErrorRef = useRef(onError)
  const onMapReadyRef = useRef(onMapReady)

  // Refs must never be written during render (React Compiler's
  // `react-hooks/refs` rule) — keep them at the latest callback via an
  // effect instead, so the mount-once effect below never needs
  // `onMarkerDragEnd`/`onMapClick`/`onError`/`onMapReady` in its own
  // dependency array.
  useEffect(() => {
    onMarkerDragEndRef.current = onMarkerDragEnd
    onMapClickRef.current = onMapClick
    onErrorRef.current = onError
    onMapReadyRef.current = onMapReady
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
    map.on('load', () => {
      onMapReadyRef.current?.(map)
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

  const boundsSwLat = bounds?.sw.lat
  const boundsSwLng = bounds?.sw.lng
  const boundsNeLat = bounds?.ne.lat
  const boundsNeLng = bounds?.ne.lng
  const boundsPadding = bounds?.padding

  useEffect(() => {
    const map = mapRef.current
    if (!map) {
      return
    }
    const duration = prefersReducedMotion() ? 0 : undefined

    if (
      boundsSwLat !== undefined &&
      boundsSwLng !== undefined &&
      boundsNeLat !== undefined &&
      boundsNeLng !== undefined
    ) {
      map.fitBounds(
        [
          [boundsSwLng, boundsSwLat],
          [boundsNeLng, boundsNeLat],
        ],
        {
          padding: boundsPadding ?? DEFAULT_BOUNDS_PADDING,
          ...(duration !== undefined ? { duration } : {}),
        },
      )
      return
    }

    map.flyTo({
      center: [center.lng, center.lat],
      zoom,
      ...(duration !== undefined ? { duration } : {}),
    })
  }, [
    center.lng,
    center.lat,
    zoom,
    boundsSwLat,
    boundsSwLng,
    boundsNeLat,
    boundsNeLng,
    boundsPadding,
  ])

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
