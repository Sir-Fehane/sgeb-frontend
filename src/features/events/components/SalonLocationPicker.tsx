import { IconMapPin, IconSearch } from '@tabler/icons-react'
import { useMutation } from '@tanstack/react-query'
import { lazy, Suspense, useState, type ReactNode } from 'react'
import { useController, useWatch, type Control } from 'react-hook-form'

import type { CreateSalonFormValues } from '@/features/events/schemas/salonCreateSchema'
import { geocodeAddress, type GeocodingCandidate } from '@/shared/api/mapboxGeocodingApi'
import {
  Alert,
  Button,
  Caption,
  ErrorText,
  FormField,
  Input,
  Skeleton,
  Text,
} from '@/shared/components'
import type { MapboxLngLat } from '@/shared/components/ui/mapbox-map'
import { env } from '@/shared/config/env'

/**
 * Lazy-loaded, not imported from the `shared/components` barrel: `mapbox-gl`
 * is a ~500 KB (gzipped) dependency, and this is the only place in the app
 * that needs it today. Loading it eagerly once measurably grew the app-wide
 * shared chunk from ~160 KB to ~2 MB — see `mapbox-map.tsx`'s own comment.
 * `import()` here makes it its own chunk, fetched only when this section
 * actually mounts (i.e. once the user opens the "crear salón" fallback).
 */
const MapboxMap = lazy(() =>
  import('@/shared/components/ui/mapbox-map').then((module) => ({
    default: module.MapboxMap,
  })),
)

export interface SalonLocationPickerProps {
  control: Control<CreateSalonFormValues>
  disabled?: boolean
}

/**
 * Neutral initial camera before any Salón coordinates exist — Torreón,
 * Coahuila, SGEB's current primary operational area. This is ONLY a
 * starting viewport: it never constrains geocoding results, marker
 * placement, or overrides a resolved/saved coordinate — `applyCandidate`
 * and `handlePositionChange` both move `center` independently the moment
 * a real location exists, and the `center`/`zoom` state below initializes
 * from any already-set `latitud`/`longitud` instead of this constant
 * whenever one is present (e.g. a future Salón-edit reuse of this
 * component).
 */
const DEFAULT_CENTER: MapboxLngLat = { lat: 25.5428, lng: -103.4068 }
const DEFAULT_ZOOM = 11
const RESOLVED_ZOOM = 16

function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function buildAddressQuery(
  calle: string | undefined,
  colonia: string | undefined,
  cp: string | undefined,
  ciudad: string | undefined,
  estado: string | undefined,
): string {
  return [calle, colonia, cp, ciudad, estado]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(', ')
}

/**
 * Replaces manual `latitud`/`longitud` entry with address → geocoding →
 * map → marker: the user builds the address in the surrounding fields,
 * triggers a search, and confirms/adjusts the suggested pin. `latitud`
 * and `longitud` stay real RHF-validated fields on `control` — this
 * component only ever writes to them through `useController`'s
 * `field.onChange`, never through parallel local state, so there is a
 * single source of truth for the coordinates the form submits (CLAUDE.md
 * "no duplicated local + form state that can drift").
 *
 * A collapsed-by-default "coordenadas manualmente" section is the only
 * escape hatch back to raw numeric entry (`renderManualCoordinates`
 * below) — surfaced when the user opts in, or when Mapbox itself can't be
 * used (missing token, geocoding failure, map init failure), so a
 * provider outage never blocks Salón creation entirely. It binds the
 * SAME `latitudField`/`longitudField` controllers the map/geocoder use —
 * there is exactly one coordinate source, never a second one that could
 * drift from the map.
 *
 * Built as a Salón-specific composition (address query, submit-blocking
 * copy) on top of the feature-agnostic `MapboxMap` primitive
 * (`shared/components/ui/mapbox-map.tsx`) — a future Event geofence
 * visualization (center + `radioGeocercaM` circle) can reuse `MapboxMap`
 * directly without depending on anything in this file.
 */
export function SalonLocationPicker({
  control,
  disabled = false,
}: SalonLocationPickerProps) {
  const accessToken = env.VITE_MAPBOX_ACCESS_TOKEN

  const [calle, colonia, cp, ciudad, estado] = useWatch({
    control,
    name: ['calle', 'colonia', 'cp', 'ciudad', 'estado'],
  })
  const latitudField = useController({ control, name: 'latitud' })
  const longitudField = useController({ control, name: 'longitud' })

  const [center, setCenter] = useState<MapboxLngLat>(() => {
    const initialLat = latitudField.field.value
    const initialLng = longitudField.field.value
    return isFiniteCoordinate(initialLat) && isFiniteCoordinate(initialLng)
      ? { lat: initialLat, lng: initialLng }
      : DEFAULT_CENTER
  })
  const [zoom, setZoom] = useState(() => {
    const initialLat = latitudField.field.value
    const initialLng = longitudField.field.value
    return isFiniteCoordinate(initialLat) && isFiniteCoordinate(initialLng)
      ? RESOLVED_ZOOM
      : DEFAULT_ZOOM
  })
  const [candidates, setCandidates] = useState<GeocodingCandidate[] | null>(null)
  const [mapError, setMapError] = useState<string | null>(null)
  const [mapRetryKey, setMapRetryKey] = useState(0)
  const [manualMode, setManualMode] = useState(false)

  const geocodeMutation = useMutation({
    mutationFn: (query: string) => geocodeAddress(query, accessToken ?? '', undefined),
    onSuccess: (results) => {
      if (results.length === 1 && results[0]) {
        applyCandidate(results[0])
        return
      }
      setCandidates(results)
    },
  })

  const addressQuery = buildAddressQuery(calle, colonia, cp, ciudad, estado)
  const addressComplete = Boolean(
    calle?.trim() && colonia?.trim() && cp?.trim() && ciudad?.trim() && estado?.trim(),
  )

  function applyCandidate(candidate: GeocodingCandidate) {
    latitudField.field.onChange(candidate.lat)
    longitudField.field.onChange(candidate.lng)
    setCenter({ lat: candidate.lat, lng: candidate.lng })
    setZoom(RESOLVED_ZOOM)
    setCandidates(null)
  }

  function handlePositionChange(position: MapboxLngLat) {
    latitudField.field.onChange(position.lat)
    longitudField.field.onChange(position.lng)
    setCenter(position)
  }

  function handleSearch() {
    setCandidates(null)
    geocodeMutation.mutate(addressQuery)
  }

  function retryMap() {
    setMapError(null)
    setMapRetryKey((key) => key + 1)
  }

  /**
   * The only place `latitud`/`longitud` are ever rendered as raw numeric
   * inputs — collapsed by default, opened only via an explicit user
   * action. Bound to the exact same `latitudField`/`longitudField`
   * controllers the map/geocoder write to, so there is no second
   * coordinate source to reconcile: typing here moves the map marker
   * (once available) exactly like a drag would, and a later geocode/drag
   * overwrites these same inputs right back.
   */
  function renderManualCoordinates(): ReactNode {
    if (!manualMode) {
      return (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => {
            setManualMode(true)
          }}
        >
          ¿No puedes usar el mapa? Ingresar coordenadas manualmente
        </Button>
      )
    }

    return (
      <div className="border-border flex flex-col gap-3 rounded-lg border p-3">
        <div className="flex items-center justify-between gap-2">
          <Text size="sm" className="font-medium">
            Coordenadas manuales
          </Text>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => {
              setManualMode(false)
            }}
          >
            Ocultar
          </Button>
        </div>
        <Caption>
          Usa esta opción si no puedes localizar correctamente el salón en el mapa.
        </Caption>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="Latitud"
            required
            error={latitudField.fieldState.error?.message}
          >
            {(controlProps) => (
              <Input
                {...controlProps}
                type="number"
                step="any"
                inputMode="decimal"
                disabled={disabled}
                value={Number.isNaN(latValue) ? '' : latValue}
                onChange={(event) => {
                  latitudField.field.onChange(event.target.valueAsNumber)
                }}
                onBlur={latitudField.field.onBlur}
              />
            )}
          </FormField>
          <FormField
            label="Longitud"
            required
            error={longitudField.fieldState.error?.message}
          >
            {(controlProps) => (
              <Input
                {...controlProps}
                type="number"
                step="any"
                inputMode="decimal"
                disabled={disabled}
                value={Number.isNaN(lngValue) ? '' : lngValue}
                onChange={(event) => {
                  longitudField.field.onChange(event.target.valueAsNumber)
                }}
                onBlur={longitudField.field.onBlur}
              />
            )}
          </FormField>
        </div>
      </div>
    )
  }

  const latValue = latitudField.field.value
  const lngValue = longitudField.field.value
  const hasCoordinates = isFiniteCoordinate(latValue) && isFiniteCoordinate(lngValue)
  const coordinatesError =
    latitudField.fieldState.error?.message ?? longitudField.fieldState.error?.message

  if (!accessToken) {
    return (
      <div className="flex flex-col gap-3">
        <Text size="sm" className="font-medium">
          Ubicación
        </Text>
        <Alert
          tone="warning"
          title="Mapa no disponible"
          action={
            !manualMode ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => {
                  setManualMode(true)
                }}
              >
                Ingresar coordenadas manualmente
              </Button>
            ) : undefined
          }
        >
          <p>
            No se pudo cargar el selector de ubicación por falta de configuración
            (VITE_MAPBOX_ACCESS_TOKEN). Contacta al equipo técnico o ingresa las
            coordenadas manualmente para continuar.
          </p>
        </Alert>
        {/* The alert's own action already offers the entry point while collapsed — only render the expanded panel here, never a second identical toggle. */}
        {manualMode ? renderManualCoordinates() : null}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <Text size="sm" className="font-medium">
          Ubicación
        </Text>
        <Button
          type="button"
          variant="outline"
          size="sm"
          icon={<IconSearch />}
          disabled={disabled || !addressComplete || geocodeMutation.isPending}
          loading={geocodeMutation.isPending}
          onClick={handleSearch}
        >
          Buscar ubicación
        </Button>
      </div>

      {!addressComplete ? (
        <Caption>
          Completa la calle, colonia, código postal, ciudad y estado para buscar.
        </Caption>
      ) : null}

      {geocodeMutation.isError ? (
        <Alert
          tone="danger"
          title="No se pudo buscar la ubicación"
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" size="sm" onClick={handleSearch}>
                Reintentar
              </Button>
              {!manualMode ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setManualMode(true)
                  }}
                >
                  Ingresar coordenadas manualmente
                </Button>
              ) : null}
            </div>
          }
        >
          <p>{geocodeMutation.error.message}</p>
        </Alert>
      ) : null}

      {geocodeMutation.isSuccess && geocodeMutation.data.length === 0 ? (
        <Alert tone="warning" title="Sin resultados">
          <p>
            No encontramos esa dirección. Ajusta los datos o coloca el pin manualmente en
            el mapa.
          </p>
        </Alert>
      ) : null}

      {candidates && candidates.length > 1 ? (
        <ul className="border-border flex flex-col divide-y rounded-lg border">
          {candidates.map((candidate) => (
            <li key={candidate.id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  applyCandidate(candidate)
                }}
                className="hover:bg-accent flex w-full items-center gap-2 px-3 py-2 text-left font-sans text-body-sm"
              >
                <IconMapPin
                  aria-hidden="true"
                  className="text-muted-foreground size-4 shrink-0"
                />
                {candidate.placeName}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {mapError ? (
        <Alert
          tone="danger"
          title="No se pudo cargar el mapa"
          action={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" size="sm" onClick={retryMap}>
                Reintentar
              </Button>
              {!manualMode ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setManualMode(true)
                  }}
                >
                  Ingresar coordenadas manualmente
                </Button>
              ) : null}
            </div>
          }
        >
          <p>{mapError}</p>
        </Alert>
      ) : null}

      <Suspense fallback={<Skeleton className="h-64 w-full sm:h-80" />}>
        <MapboxMap
          key={mapRetryKey}
          accessToken={accessToken}
          center={center}
          zoom={zoom}
          marker={
            hasCoordinates
              ? { lat: latValue, lng: lngValue, draggable: !disabled }
              : undefined
          }
          onMarkerDragEnd={disabled ? undefined : handlePositionChange}
          onMapClick={disabled ? undefined : handlePositionChange}
          onError={setMapError}
          ariaLabel="Mapa para seleccionar la ubicación del salón"
        />
      </Suspense>

      {!manualMode ? (
        <>
          <Caption>
            {hasCoordinates
              ? `Coordenadas seleccionadas: ${latValue.toFixed(6)}, ${lngValue.toFixed(6)}. Arrastra el pin o haz clic en el mapa para ajustar.`
              : 'Busca la dirección o haz clic en el mapa para colocar el pin del salón.'}
          </Caption>
          {coordinatesError ? <ErrorText>{coordinatesError}</ErrorText> : null}
        </>
      ) : null}

      {/*
       * The collapsed toggle is suppressed while an error alert already
       * offers its own "Ingresar coordenadas manualmente" action, so the
       * two don't show as duplicate, identically-labeled buttons — the
       * expanded panel itself still always renders once manualMode is on,
       * regardless of any error state.
       */}
      {manualMode || !(geocodeMutation.isError || mapError)
        ? renderManualCoordinates()
        : null}
    </div>
  )
}
