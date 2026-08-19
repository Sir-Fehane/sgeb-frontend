import { zodResolver } from '@hookform/resolvers/zod'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'

import { SalonLocationPicker } from '@/features/events/components/SalonLocationPicker'
import {
  createSalonFormSchema,
  type CreateSalonFormValues,
} from '@/features/events/schemas/salonCreateSchema'

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

function Harness({ onSubmit }: { onSubmit: (values: CreateSalonFormValues) => void }) {
  const { control, handleSubmit } = useForm<CreateSalonFormValues>({
    resolver: zodResolver(createSalonFormSchema),
    defaultValues: VALID_DEFAULTS,
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

describe('SalonLocationPicker without a configured Mapbox token', () => {
  it('shows a config-missing alert instead of rendering the map, and never crashes the form', () => {
    render(<Harness onSubmit={vi.fn()} />)

    expect(screen.getByText('Mapa no disponible')).toBeInTheDocument()
    expect(screen.getByText(/VITE_MAPBOX_ACCESS_TOKEN/)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Buscar ubicación' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/^Latitud/)).not.toBeInTheDocument()
  })

  it('offers the manual coordinate fallback, and a valid manual entry can still submit the salón', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<Harness onSubmit={onSubmit} />)

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
