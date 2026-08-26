import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CubaitorFleetSection } from '@/features/cubaitor/components/CubaitorFleetSection'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

function envelope(data: unknown) {
  return { result: { code: 'SGEB-0000', message: 'ok' }, data }
}

const CUBAITOR_RECORD = {
  id_cubaitor: 7,
  nombre: 'Barra 1',
  mac: 'AA:BB:CC:DD:EE:FF',
  host_ip: null,
  num_pins: 8,
  estado: 'activo',
  ultima_conexion: '2026-08-25T10:00:00',
}

function renderSection() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <CubaitorFleetSection />
    </QueryClientProvider>,
  )
}

describe('CubaitorFleetSection live status', () => {
  it('renders "En línea" when GET /cubaitors/{id}/estado reports enLinea: true', async () => {
    vi.mocked(requestSgeb).mockImplementation((config) => {
      if (config.url === '/cubaitors') return Promise.resolve(envelope([CUBAITOR_RECORD]))
      if (config.url === '/cubaitors/7/estado') {
        return Promise.resolve(
          envelope({
            id_cubaitor: 7,
            nombre: 'Barra 1',
            mac: 'AA:BB:CC:DD:EE:FF',
            en_linea: true,
            ultima_conexion: '2026-08-25T10:00:00',
            segundos_sin_reportar: 5,
            pines_configurados: 2,
          }),
        )
      }
      return Promise.reject(new Error(`Unexpected request: ${String(config.url)}`))
    })

    renderSection()

    expect(await screen.findByText('En línea')).toBeInTheDocument()
  })

  it('renders "Fuera de línea" when GET /cubaitors/{id}/estado reports enLinea: false', async () => {
    vi.mocked(requestSgeb).mockImplementation((config) => {
      if (config.url === '/cubaitors') return Promise.resolve(envelope([CUBAITOR_RECORD]))
      if (config.url === '/cubaitors/7/estado') {
        return Promise.resolve(
          envelope({
            id_cubaitor: 7,
            nombre: 'Barra 1',
            mac: 'AA:BB:CC:DD:EE:FF',
            en_linea: false,
            ultima_conexion: null,
            segundos_sin_reportar: null,
            pines_configurados: 2,
          }),
        )
      }
      return Promise.reject(new Error(`Unexpected request: ${String(config.url)}`))
    })

    renderSection()

    expect(await screen.findByText('Fuera de línea')).toBeInTheDocument()
  })

  it('renders no online/offline claim while the estado request is pending or fails', async () => {
    vi.mocked(requestSgeb).mockImplementation((config) => {
      if (config.url === '/cubaitors') return Promise.resolve(envelope([CUBAITOR_RECORD]))
      if (config.url === '/cubaitors/7/estado') {
        return Promise.reject(new Error('network down'))
      }
      return Promise.reject(new Error(`Unexpected request: ${String(config.url)}`))
    })

    renderSection()

    expect(await screen.findByText('Barra 1')).toBeInTheDocument()
    expect(screen.queryByText('En línea')).not.toBeInTheDocument()
    expect(screen.queryByText('Fuera de línea')).not.toBeInTheDocument()
    expect(screen.getByText(/^Última conexión: /)).toBeInTheDocument()
  })
})
