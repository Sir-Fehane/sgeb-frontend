import { IconFocus2, IconMapPin, IconMapPinOff } from '@tabler/icons-react'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { GeoJSONSource, Map as MapboxGlMap } from 'mapbox-gl'

import { Alert, Button, Caption, Skeleton } from '@/shared/components'
import type { MapboxMapBounds } from '@/shared/components/ui/mapbox-map'
import { env } from '@/shared/config/env'
import { cn } from '@/shared/utils/cn'
import {
  createGeoCircle,
  getGeoCircleBounds,
  type GeoCircleFeature,
} from '@/shared/utils/geoCircle'
import { prefersReducedMotion } from '@/shared/utils/reducedMotion'

/**
 * Lazy-loaded, not imported from the `shared/components` barrel — same
 * reasoning as `SalonLocationPicker`'s own import of this module:
 * `mapbox-gl` is a ~500 KB (gzipped) dependency, and eagerly re-exporting
 * it once measurably grew the app-wide shared chunk (see `mapbox-map.tsx`'s
 * own comment). `import()` here makes it its own on-demand chunk, fetched
 * only once this preview actually mounts (Event Create/Edit's geofence
 * section, or Event Detail's read-only one) — never for `/eventos` or any
 * event card.
 */
const MapboxMap = lazy(() =>
  import('@/shared/components/ui/mapbox-map').then((module) => ({
    default: module.MapboxMap,
  })),
)

export interface EventGeofenceMapPreviewSalon {
  nombre?: string | undefined
  lat: number
  lng: number
}

export interface EventGeofenceMapPreviewProps {
  /** `null` when no salón is selected/resolvable yet — renders a compact empty state instead of a broken map. */
  salon: EventGeofenceMapPreviewSalon | null
  /** The Event's current (possibly in-progress, possibly invalid while the field is empty mid-edit) `radioGeocercaM` — the exact value, never clamped/defaulted by this component. */
  radiusMeters: number
  /** Overrides the default "no salón selected" copy — e.g. Edit/Detail's "no pudimos resolver la ubicación" case, which is a resolution failure rather than an unmade choice. */
  emptyStateMessage?: string
  className?: string
}

const GEOFENCE_SOURCE_ID = 'event-geofence-circle'
const GEOFENCE_FILL_LAYER_ID = 'event-geofence-circle-fill'
const GEOFENCE_LINE_LAYER_ID = 'event-geofence-circle-outline'
/**
 * Mapbox `paint` properties need a concrete color, not a CSS custom
 * property — this is the smallest maintainable bridge from
 * `globals.css`'s `--brand-info` (#185fa5, "Información / Secundario")
 * into that constraint. Keep this literal in sync with that token if the
 * brand palette ever changes.
 */
const GEOFENCE_COLOR = '#185fa5'
const GEOFENCE_BOUNDS_PADDING = 56
/** Debounces the camera's `fitBounds` while `radiusMeters` changes rapidly (e.g. typing digit-by-digit) — the circle itself (drawn via `setData`) still updates on every change; only the animated camera move waits. */
const BOUNDS_DEBOUNCE_MS = 400

/**
 * Not type-annotated as `GeoJSON.FeatureCollection`: that ambient namespace
 * only resolves when `@types/geojson` is installed, which this project
 * deliberately doesn't add (see `createGeoCircle`'s own comment on staying
 * dependency-free) — `mapbox-gl`'s own `.d.ts` references it internally
 * too, tolerated only because `skipLibCheck` never validates a `.d.ts`'s
 * own internals. Left inferred here instead, so `setData`/`addSource`
 * accept it structurally without this file needing to resolve that
 * namespace itself.
 */
const EMPTY_GEOJSON = { type: 'FeatureCollection' as const, features: [] }

const DEFAULT_EMPTY_MESSAGE =
  'Selecciona un salón para ver la vista previa de la geocerca.'

function isValidRadius(value: number): boolean {
  return Number.isFinite(value) && value > 0
}

function hasValidCoordinates(
  salon: EventGeofenceMapPreviewSalon | null,
): salon is EventGeofenceMapPreviewSalon {
  return salon !== null && Number.isFinite(salon.lat) && Number.isFinite(salon.lng)
}

/**
 * Real, geodesic geofence preview — Salón marker + a `radiusMeters` circle
 * drawn in actual meters (`createGeoCircle`), reusing `MapboxMap`'s
 * `bounds`/`onMapReady` extension to own its own GeoJSON source/layers
 * without that primitive knowing anything about circles.
 *
 * Read-only by design: the marker is never draggable and no
 * `onMapClick`/`onMarkerDragEnd` handler is wired, so this can never mutate
 * Salón coordinates — that stays `SalonLocationPicker`'s job exclusively.
 * Panning/zooming to inspect the area is still available (`MapboxMap`
 * itself never disables that).
 *
 * Mapbox stays optional: a missing token, a failed map/style load, or an
 * unresolvable Salón all degrade to a compact inline state here — this
 * component never throws and never blocks whatever numeric
 * `radio_geocerca_m` field the caller renders alongside it.
 */
export function EventGeofenceMapPreview({
  salon,
  radiusMeters,
  emptyStateMessage = DEFAULT_EMPTY_MESSAGE,
  className,
}: EventGeofenceMapPreviewProps) {
  const accessToken = env.VITE_MAPBOX_ACCESS_TOKEN
  const mapRef = useRef<MapboxGlMap | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  const validSalon = hasValidCoordinates(salon) ? salon : null
  const validRadius = isValidRadius(radiusMeters)

  const circle = useMemo<GeoCircleFeature | null>(() => {
    if (!validSalon || !validRadius) {
      return null
    }
    return createGeoCircle({ lat: validSalon.lat, lng: validSalon.lng }, radiusMeters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validSalon?.lat, validSalon?.lng, validRadius, radiusMeters])

  const [debouncedBounds, setDebouncedBounds] = useState<MapboxMapBounds | null>(null)
  /**
   * Whether a bounds fit has ever committed before — read (never written
   * synchronously) inside the effect below purely to pick 0 vs
   * `BOUNDS_DEBOUNCE_MS` as the timer delay; `setDebouncedBounds` itself
   * only ever runs inside the `setTimeout` callback, never directly in the
   * effect body (an unconditional synchronous `setState` there would
   * trigger cascading renders — see `react-hooks/set-state-in-effect`).
   */
  const hasFitOnceRef = useRef(false)

  useEffect(() => {
    // No circle (no salón/invalid radius): leave the camera exactly where
    // it was — the OTHER effect below already clears the drawn polygon via
    // `setData`, so there is nothing wrong left on screen; jerking the
    // camera back to some default would be more jarring than just leaving
    // it in place until a valid circle exists again.
    if (!circle) {
      return
    }
    // The very first fit (e.g. a Salón just got selected) applies on the
    // next tick — effectively immediate, but still genuinely async so the
    // state update stays inside this callback rather than the effect body
    // — only a LATER change (radius typing, switching Salón again) waits
    // the full debounce.
    const delay = hasFitOnceRef.current ? BOUNDS_DEBOUNCE_MS : 0
    const timer = setTimeout(() => {
      hasFitOnceRef.current = true
      setDebouncedBounds(getGeoCircleBounds(circle))
    }, delay)
    return () => {
      clearTimeout(timer)
    }
  }, [circle])

  useEffect(() => {
    const map = mapRef.current
    if (!map) {
      return
    }
    const source = map.getSource<GeoJSONSource>(GEOFENCE_SOURCE_ID)
    source?.setData(circle ?? EMPTY_GEOJSON)
  }, [circle])

  function handleMapReady(map: MapboxGlMap) {
    mapRef.current = map
    if (map.getSource(GEOFENCE_SOURCE_ID)) {
      return
    }
    map.addSource(GEOFENCE_SOURCE_ID, { type: 'geojson', data: circle ?? EMPTY_GEOJSON })
    map.addLayer({
      id: GEOFENCE_FILL_LAYER_ID,
      type: 'fill',
      source: GEOFENCE_SOURCE_ID,
      paint: { 'fill-color': GEOFENCE_COLOR, 'fill-opacity': 0.15 },
    })
    map.addLayer({
      id: GEOFENCE_LINE_LAYER_ID,
      type: 'line',
      source: GEOFENCE_SOURCE_ID,
      paint: { 'line-color': GEOFENCE_COLOR, 'line-width': 2 },
    })
  }

  function retryMap() {
    setMapError(null)
    setRetryKey((key) => key + 1)
  }

  /**
   * Restores the camera to the Salón marker + full geofence circle, using
   * the exact same `getGeoCircleBounds`/padding the preview itself fits to
   * — imperatively, straight through the live `mapRef.current` instance
   * `onMapReady` already handed us, so panning/zooming away and clicking
   * this never recreates the map. Never touches Salón coordinates or
   * `radioGeocercaM` — purely a camera move.
   */
  function handleRecenter() {
    const map = mapRef.current
    if (!map || !circle) {
      return
    }
    const bounds = getGeoCircleBounds(circle)
    map.fitBounds(
      [
        [bounds.sw.lng, bounds.sw.lat],
        [bounds.ne.lng, bounds.ne.lat],
      ],
      {
        padding: GEOFENCE_BOUNDS_PADDING,
        ...(prefersReducedMotion() ? { duration: 0 } : {}),
      },
    )
  }

  if (!validSalon) {
    return (
      <div
        className={cn(
          'border-border flex min-h-32 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-4 text-center sm:min-h-40',
          className,
        )}
      >
        <IconMapPin aria-hidden="true" className="text-muted-foreground size-5" />
        <Caption>{emptyStateMessage}</Caption>
      </div>
    )
  }

  if (!accessToken) {
    return (
      <Alert
        tone="warning"
        icon={<IconMapPinOff />}
        title="Vista previa no disponible"
        className={className}
      >
        <p>
          No pudimos mostrar el mapa en este momento. Puedes seguir configurando el radio
          normalmente.
        </p>
      </Alert>
    )
  }

  if (mapError) {
    return (
      <Alert
        tone="danger"
        icon={<IconMapPinOff />}
        title="No se pudo cargar el mapa"
        action={
          <Button type="button" variant="outline" size="sm" onClick={retryMap}>
            Reintentar
          </Button>
        }
        className={className}
      >
        <p>{mapError}</p>
      </Alert>
    )
  }

  return (
    <Suspense fallback={<Skeleton className={cn('h-64 w-full sm:h-80', className)} />}>
      <div className="relative">
        <MapboxMap
          key={retryKey}
          accessToken={accessToken}
          center={{ lat: validSalon.lat, lng: validSalon.lng }}
          zoom={16}
          bounds={
            debouncedBounds
              ? { ...debouncedBounds, padding: GEOFENCE_BOUNDS_PADDING }
              : undefined
          }
          marker={{ lat: validSalon.lat, lng: validSalon.lng }}
          onMapReady={handleMapReady}
          onError={setMapError}
          {...(className ? { className } : {})}
          ariaLabel={
            validSalon.nombre
              ? `Vista previa de la geocerca en ${validSalon.nombre}`
              : 'Vista previa de la geocerca del salón'
          }
        />
        {circle ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            icon={<IconFocus2 />}
            aria-label="Centrar en salón"
            title="Centrar en salón"
            onClick={handleRecenter}
            className="absolute top-2 left-2"
          />
        ) : null}
      </div>
    </Suspense>
  )
}
