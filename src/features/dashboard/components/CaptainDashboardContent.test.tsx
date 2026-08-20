import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import {
  CaptainDashboardContent,
  type CaptainDashboardContentProps,
} from '@/features/dashboard/components/CaptainDashboardContent'
import type { CaptainDashboardViewModel } from '@/features/dashboard/types/dashboard'

const DASHBOARD: CaptainDashboardViewModel = {
  enCurso: [],
  proximos: [],
  borradores: 0,
  porCerrar: [],
  totales: { enCurso: 0, proximos: 0, porCerrar: 0 },
}

function renderContent(overrides: Partial<CaptainDashboardContentProps> = {}) {
  return render(
    <MemoryRouter>
      <CaptainDashboardContent dashboard={DASHBOARD} {...overrides} />
    </MemoryRouter>,
  )
}

describe('CaptainDashboardContent', () => {
  it('renders only the loading skeleton when isLoading is true — no stale section content', () => {
    renderContent({ isLoading: true })

    expect(
      screen.getByRole('status', { name: 'Cargando panel del capitán' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('En curso')).not.toBeInTheDocument()
  })

  it('renders only the global error state when errorMessage is set', () => {
    renderContent({ errorMessage: 'No se pudo cargar el panel.' })

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar el panel.')
    expect(screen.queryByText('En curso')).not.toBeInTheDocument()
  })

  it('invokes onRetry from the global error state', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    renderContent({ errorMessage: 'Error.', onRetry })

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('renders the real portfolio sections with genuine zero/empty copy — no "No disponible" placeholder', () => {
    renderContent()

    expect(screen.getByRole('heading', { name: 'En curso' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Próximos eventos' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Por cerrar' })).toBeInTheDocument()
    expect(screen.queryByText('No disponible.')).not.toBeInTheDocument()
  })
})
