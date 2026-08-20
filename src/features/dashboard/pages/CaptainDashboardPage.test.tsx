import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CaptainDashboardPage } from '@/features/dashboard/pages/CaptainDashboardPage'
import type { DashboardCapitanApiRecord } from '@/features/dashboard/services/dashboardApi'
import { SgebApplicationError, SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

const RECORD: DashboardCapitanApiRecord = {
  en_curso: [
    {
      id_evento: 1,
      id_salon: 3,
      titulo: 'Boda García',
      tipo: 'social',
      fecha: '2026-09-12',
      hora_presentacion: '16:00',
      inicio: '2026-09-12T18:00:00',
      fin: null,
      cupo_meseros: 12,
      num_mesas: 20,
      tarifa_por_mesero: 450,
      estado: 'en_curso',
      salon: { nombre: 'Salón Roble' },
    },
  ],
  proximos: [],
  borradores: 3,
  por_cerrar: [],
  totales: { en_curso: 1, proximos: 0, por_cerrar: 0 },
}

const EMPTY_RECORD: DashboardCapitanApiRecord = {
  en_curso: [],
  proximos: [],
  borradores: 0,
  por_cerrar: [],
  totales: { en_curso: 0, proximos: 0, por_cerrar: 0 },
}

function envelope(data: DashboardCapitanApiRecord) {
  return { result: { code: 'SGEB-0000', message: 'ok' }, data }
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0 } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CaptainDashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CaptainDashboardPage', () => {
  it('renders the real GET /dashboard/capitan data — the confirmed en_curso event and its real cupo, never a fixture number', async () => {
    vi.mocked(requestSgeb).mockResolvedValue(envelope(RECORD))

    renderPage()

    expect(await screen.findByText('Boda García')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument() // cupoMeseros, real value
    expect(screen.getByText('3')).toBeInTheDocument() // borradores tile, real value
    expect(screen.queryByText(/datos de desarrollo/i)).not.toBeInTheDocument()
  })

  it('shows a loading state while the request is pending', () => {
    vi.mocked(requestSgeb).mockReturnValue(new Promise(() => undefined))

    renderPage()

    expect(
      screen.getByRole('status', { name: 'Cargando panel del capitán' }),
    ).toBeInTheDocument()
  })

  it('renders genuine empty-state copy for every section when every real count is zero', async () => {
    vi.mocked(requestSgeb).mockResolvedValue(envelope(EMPTY_RECORD))

    renderPage()

    expect(
      await screen.findByText('No tienes eventos en curso en este momento.'),
    ).toBeInTheDocument()
    expect(screen.getByText('No hay próximos eventos publicados.')).toBeInTheDocument()
    expect(
      screen.getByText('No hay eventos finalizados pendientes de cierre.'),
    ).toBeInTheDocument()
  })

  it('shows the safe application error message and never technical_message', async () => {
    vi.mocked(requestSgeb).mockRejectedValue(
      new SgebApplicationError(500, {
        code: 'SGEB-5008',
        message: 'No pudimos completar la operación.',
        technical_message: 'stack trace secreto interno',
      }),
    )

    renderPage()

    expect(
      await screen.findByText('No pudimos completar la operación.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/stack trace secreto interno/)).not.toBeInTheDocument()
  })

  it('offers a retry on network failure that refetches real data', async () => {
    vi.mocked(requestSgeb).mockRejectedValue(
      new SgebNetworkError('No pudimos comunicarnos con el servidor.'),
    )
    const user = userEvent.setup()
    renderPage()

    expect(
      await screen.findByText('No pudimos comunicarnos con el servidor.', undefined, {
        timeout: 5000,
      }),
    ).toBeInTheDocument()

    vi.mocked(requestSgeb).mockResolvedValue(envelope(RECORD))
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('Boda García')).toBeInTheDocument()
  })
})
