import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { EventServiceRequestsList } from '@/features/events/service-requests/components/EventServiceRequestsList'
import type { ServiceRequestViewModel } from '@/features/events/service-requests/types/serviceRequest'

const PENDING: ServiceRequestViewModel = {
  idSolicitud: 1,
  idMesa: 5,
  idParticipacion: null,
  tipo: 'atencion',
  estado: 'pendiente',
  creadaEn: '2026-09-12T20:00:00Z',
  atendidaEn: null,
}

const RESOLVED: ServiceRequestViewModel = {
  idSolicitud: 2,
  idMesa: 9,
  idParticipacion: 40,
  tipo: 'cuenta',
  estado: 'atendida',
  creadaEn: '2026-09-12T19:00:00Z',
  atendidaEn: '2026-09-12T19:05:00Z',
}

describe('EventServiceRequestsList', () => {
  it('renders an empty message when there are no requests', () => {
    render(
      <EventServiceRequestsList
        requests={[]}
        onAttend={vi.fn()}
        onCancel={vi.fn()}
        pendingIdSolicitud={null}
      />,
    )
    expect(screen.getByText('No hay solicitudes con este filtro.')).toBeInTheDocument()
  })

  it('shows Atender/Cancelar actions only for a pendiente request, never for a resolved one', () => {
    render(
      <EventServiceRequestsList
        requests={[PENDING, RESOLVED]}
        onAttend={vi.fn()}
        onCancel={vi.fn()}
        pendingIdSolicitud={null}
      />,
    )
    expect(screen.getAllByRole('button', { name: 'Atender' })).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'Cancelar' })).toHaveLength(1)
  })

  it('calls onAttend with the request id when Atender is clicked', async () => {
    const user = userEvent.setup()
    const onAttend = vi.fn()
    render(
      <EventServiceRequestsList
        requests={[PENDING]}
        onAttend={onAttend}
        onCancel={vi.fn()}
        pendingIdSolicitud={null}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Atender' }))

    expect(onAttend).toHaveBeenCalledWith(1)
  })

  it('disables only the row currently mid-mutation, not every row', () => {
    render(
      <EventServiceRequestsList
        requests={[PENDING]}
        onAttend={vi.fn()}
        onCancel={vi.fn()}
        pendingIdSolicitud={1}
      />,
    )
    expect(screen.getByRole('button', { name: 'Atender' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
  })
})
