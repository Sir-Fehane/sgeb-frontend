import { zodResolver } from '@hookform/resolvers/zod'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SalonLocationPicker } from '@/features/events/components/SalonLocationPicker'
import {
  createSalonFormSchema,
  type CreateSalonFormValues,
} from '@/features/events/schemas/salonCreateSchema'
import { geocodeAddress, GeocodingError } from '@/shared/api/mapboxGeocodingApi'
import type * as MapboxGeocodingApiModule from '@/shared/api/mapboxGeocodingApi'
import type { MapboxMapProps } from '@/shared/components/ui/mapbox-map'

vi.mock('@/shared/api/mapboxGeocodingApi', async () => {
  const actual = await vi.importActual<typeof MapboxGeocodingApiModule>(
    '@/shared/api/mapboxGeocodingApi',
  )
  return { ...actual, geocodeAddress: vi.fn() }
})

vi.mock('@/shared/components/ui/mapbox-map', () => ({
  MapboxMap: (props: MapboxMapProps) => (
    <div data-testid="mapbox-map-stub">
      <span data-testid="map-center">{`${String(props.center.lat)},${String(props.center.lng)}`}</span>
      {props.marker ? (
        <span data-testid="map-marker">{`${String(props.marker.lat)},${String(props.marker.lng)}`}</span>
      ) : null}
      <button
        type="button"
        onClick={() => props.onMarkerDragEnd?.({ lat: 20, lng: -100 })}
      >
        simulate-drag
      </button>
      <button type="button" onClick={() => props.onMapClick?.({ lat: 21, lng: -101 })}>
        simulate-click
      </button>
      <button type="button" onClick={() => props.onError?.('mapbox error')}>
        simulate-error
      </button>
    </div>
  ),
}))

const VALID_DEFAULTS: CreateSalonFormValues = {
  nombre: 'Salón Roble',
  calle: 'Av. Reforma 100',
  cp: '06600',
  colonia: 'Juárez',
  ciudad: 'CDMX',
  estado: 'CDMX',
  latitud: Number.NaN,
  longitud: Number.NaN,
  capacidadMaxMesas: 30,
  capacidadPersonas: 150,
}

function Harness({
  onSubmit,
  defaultValues = VALID_DEFAULTS,
}: {
  onSubmit: (values: CreateSalonFormValues) => void
  defaultValues?: CreateSalonFormValues
}) {
  const { control, handleSubmit } = useForm<CreateSalonFormValues>({
    resolver: zodResolver(createSalonFormSchema),
    defaultValues,
  })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return (
    <QueryClientProvider client={queryClient}>
      <form
        onSubmit={(event) =>
          void handleSubmit((values) => {
            onSubmit(values)
          })(event)
        }
      >
        <SalonLocationPicker control={control} />
        <button type="submit">enviar</button>
      </form>
    </QueryClientProvider>
  )
}

beforeEach(() => {
  vi.mocked(geocodeAddress).mockReset()
})

describe('SalonLocationPicker', () => {
  it('shows a loading skeleton while the map bundle loads, then the map', async () => {
    render(<Harness onSubmit={vi.fn()} />)

    expect(screen.getByRole('presentation', { hidden: true })).toBeInTheDocument()
    expect(await screen.findByTestId('mapbox-map-stub')).toBeInTheDocument()
  })

  it('opens on Torreón, Coahuila when no coordinates exist yet', async () => {
    render(<Harness onSubmit={vi.fn()} />)

    expect(await screen.findByTestId('map-center')).toHaveTextContent('25.5428,-103.4068')
    expect(screen.queryByTestId('map-marker')).not.toBeInTheDocument()
  })

  it('initializes the viewport from already-set coordinates instead of Torreón', async () => {
    render(
      <Harness
        onSubmit={vi.fn()}
        defaultValues={{ ...VALID_DEFAULTS, latitud: 20.9674, longitud: -89.5926 }}
      />,
    )

    expect(await screen.findByTestId('map-center')).toHaveTextContent('20.9674,-89.5926')
    expect(screen.getByTestId('map-marker')).toHaveTextContent('20.9674,-89.5926')
  })

  it('flies to the geocoded result, overriding the default Torreón viewport', async () => {
    const user = userEvent.setup()
    vi.mocked(geocodeAddress).mockResolvedValue([
      { id: '1', placeName: 'Gómez Palacio, Durango', lat: 25.5675, lng: -103.4967 },
    ])
    render(<Harness onSubmit={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Buscar ubicación' }))

    expect(await screen.findByTestId('map-center')).toHaveTextContent('25.5675,-103.4967')
  })

  it('disables "Buscar ubicación" and hints while the address is incomplete', () => {
    render(
      <Harness onSubmit={vi.fn()} defaultValues={{ ...VALID_DEFAULTS, calle: '' }} />,
    )

    expect(screen.getByRole('button', { name: 'Buscar ubicación' })).toBeDisabled()
    expect(
      screen.getByText(/Completa la calle, colonia, código postal, ciudad y estado/),
    ).toBeInTheDocument()
  })

  it('searches with the joined address and auto-applies a single result', async () => {
    const user = userEvent.setup()
    vi.mocked(geocodeAddress).mockResolvedValue([
      {
        id: '1',
        placeName: 'Av. Reforma 100, Juárez, CDMX',
        lat: 19.4326,
        lng: -99.1332,
      },
    ])
    const onSubmit = vi.fn()
    render(<Harness onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: 'Buscar ubicación' }))

    expect(geocodeAddress).toHaveBeenCalledWith(
      'Av. Reforma 100, Juárez, 06600, CDMX, CDMX',
      'pk.test-token',
      undefined,
    )
    expect(await screen.findByTestId('map-marker')).toHaveTextContent('19.4326,-99.1332')
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/^Latitud/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/^Longitud/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'enviar' }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ latitud: 19.4326, longitud: -99.1332 }),
    )
  })

  it('lists multiple candidates and applies the one the user picks', async () => {
    const user = userEvent.setup()
    vi.mocked(geocodeAddress).mockResolvedValue([
      { id: '1', placeName: 'Candidato uno', lat: 19.1, lng: -99.1 },
      { id: '2', placeName: 'Candidato dos', lat: 19.2, lng: -99.2 },
    ])
    render(<Harness onSubmit={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Buscar ubicación' }))
    expect(await screen.findByText('Candidato dos')).toBeInTheDocument()
    expect(screen.queryByTestId('map-marker')).not.toBeInTheDocument()

    await user.click(screen.getByText('Candidato dos'))

    expect(await screen.findByTestId('map-marker')).toHaveTextContent('19.2,-99.2')
    expect(screen.queryByText('Candidato uno')).not.toBeInTheDocument()
  })

  it('shows a "sin resultados" alert and sets no coordinates on a zero-result search', async () => {
    const user = userEvent.setup()
    vi.mocked(geocodeAddress).mockResolvedValue([])
    render(<Harness onSubmit={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Buscar ubicación' }))

    expect(await screen.findByText('Sin resultados')).toBeInTheDocument()
    expect(screen.queryByTestId('map-marker')).not.toBeInTheDocument()
  })

  it('shows a safe error message and offers Reintentar/manual fallback on a provider failure', async () => {
    const user = userEvent.setup()
    vi.mocked(geocodeAddress).mockRejectedValue(
      new GeocodingError('No se pudo buscar la ubicación. Intenta de nuevo.'),
    )
    render(<Harness onSubmit={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Buscar ubicación' }))

    expect(
      await screen.findByText('No se pudo buscar la ubicación. Intenta de nuevo.'),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('map-marker')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Ingresar coordenadas manualmente' }),
    )

    expect(screen.getByLabelText(/^Latitud/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Longitud/)).toBeInTheDocument()
  })

  it('updates the submitted coordinates when the marker is dragged', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <Harness
        onSubmit={onSubmit}
        defaultValues={{ ...VALID_DEFAULTS, latitud: 19, longitud: -99 }}
      />,
    )

    await user.click(await screen.findByRole('button', { name: 'simulate-drag' }))
    await user.click(screen.getByRole('button', { name: 'enviar' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ latitud: 20, longitud: -100 }),
    )
  })

  it('updates the submitted coordinates on a map click', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <Harness
        onSubmit={onSubmit}
        defaultValues={{ ...VALID_DEFAULTS, latitud: 19, longitud: -99 }}
      />,
    )

    await user.click(await screen.findByRole('button', { name: 'simulate-click' }))
    await user.click(screen.getByRole('button', { name: 'enviar' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ latitud: 21, longitud: -101 }),
    )
  })

  it('surfaces a map initialization error with Reintentar and manual fallback, without crashing', async () => {
    const user = userEvent.setup()
    render(<Harness onSubmit={vi.fn()} />)

    await user.click(await screen.findByRole('button', { name: 'simulate-error' }))

    expect(await screen.findByText('mapbox error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Ingresar coordenadas manualmente' }),
    ).toBeInTheDocument()
  })

  it('rejects submission with no coordinates selected, never sending false ones', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<Harness onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: 'enviar' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(await screen.findByText('Ingresa la latitud.')).toBeInTheDocument()
  })
})

const OPEN_MANUAL_FALLBACK_NAME =
  '¿No puedes usar el mapa? Ingresar coordenadas manualmente'

function openManualFallback(user: ReturnType<typeof userEvent.setup>) {
  return user.click(screen.getByRole('button', { name: OPEN_MANUAL_FALLBACK_NAME }))
}

describe('SalonLocationPicker manual coordinate fallback', () => {
  it('does not show manual lat/lng inputs by default — Mapbox stays the primary workflow', () => {
    render(<Harness onSubmit={vi.fn()} />)

    expect(screen.queryByLabelText(/^Latitud/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/^Longitud/)).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: OPEN_MANUAL_FALLBACK_NAME }),
    ).toBeInTheDocument()
  })

  it('opens on demand and can be hidden again', async () => {
    const user = userEvent.setup()
    render(<Harness onSubmit={vi.fn()} />)

    await openManualFallback(user)

    expect(screen.getByLabelText(/^Latitud/)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Longitud/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Ocultar' }))

    expect(screen.queryByLabelText(/^Latitud/)).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: OPEN_MANUAL_FALLBACK_NAME }),
    ).toBeInTheDocument()
  })

  it('writes manually entered coordinates into the SAME fields the map uses, and submits them', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<Harness onSubmit={onSubmit} />)

    await openManualFallback(user)
    await user.type(screen.getByLabelText(/^Latitud/), '19')
    await user.type(screen.getByLabelText(/^Longitud/), '-99')

    expect(await screen.findByTestId('map-marker')).toHaveTextContent('19,-99')

    await user.click(screen.getByRole('button', { name: 'enviar' }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ latitud: 19, longitud: -99 }),
    )
  })

  it('keeps the existing -90..90/-180..180 validation for manual coordinates and blocks submission', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<Harness onSubmit={onSubmit} />)

    await openManualFallback(user)
    await user.type(screen.getByLabelText(/^Latitud/), '200')
    await user.type(screen.getByLabelText(/^Longitud/), '-99')
    await user.click(screen.getByRole('button', { name: 'enviar' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(
      await screen.findByText('La latitud debe estar entre -90 y 90.'),
    ).toBeInTheDocument()
  })

  it('reconciles to the same fields when the map is used after manual entry — no duplicate state', async () => {
    const user = userEvent.setup()
    render(<Harness onSubmit={vi.fn()} />)

    await openManualFallback(user)
    await user.type(screen.getByLabelText(/^Latitud/), '19')
    await user.type(screen.getByLabelText(/^Longitud/), '-99')
    expect(await screen.findByTestId('map-marker')).toHaveTextContent('19,-99')

    await user.click(screen.getByRole('button', { name: 'simulate-drag' }))

    expect(screen.getByLabelText(/^Latitud/)).toHaveValue(20)
    expect(screen.getByLabelText(/^Longitud/)).toHaveValue(-100)
    expect(screen.getByTestId('map-marker')).toHaveTextContent('20,-100')
  })

  it('offers the manual fallback from a geocoding-error alert, reusing the same fields on submit', async () => {
    const user = userEvent.setup()
    vi.mocked(geocodeAddress).mockRejectedValue(
      new GeocodingError('No se pudo buscar la ubicación. Intenta de nuevo.'),
    )
    const onSubmit = vi.fn()
    render(<Harness onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: 'Buscar ubicación' }))
    await screen.findByText('No se pudo buscar la ubicación. Intenta de nuevo.')
    await user.click(
      screen.getByRole('button', { name: 'Ingresar coordenadas manualmente' }),
    )
    await user.type(screen.getByLabelText(/^Latitud/), '19')
    await user.type(screen.getByLabelText(/^Longitud/), '-99')
    await user.click(screen.getByRole('button', { name: 'enviar' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ latitud: 19, longitud: -99 }),
    )
  })
})
