import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import type { EventDetailViewModel } from '@/features/events/types/event'
import {
  TeamSelectionContent,
  type TeamSelectionContentProps,
} from '@/features/events/team-selection/components/TeamSelectionContent'
import type { TeamSelectionParticipantViewModel } from '@/features/events/team-selection/types/teamSelection'

const EVENTO: EventDetailViewModel = {
  idEvento: 1001,
  titulo: 'Evento de demostración — boda',
  tipo: 'social',
  estado: 'publicado',
  salonNombre: 'Salón Roble',
  fecha: '2026-09-12',
  horaPresentacion: '16:00',
  inicio: '2026-09-12T18:00:00',
  cupoMeseros: 12,
  numMesas: 20,
  tarifaPorMesero: 450,
  radioGeocercaM: 150,
}

const CANDIDATO: TeamSelectionParticipantViewModel = {
  idParticipacion: 5001,
  nombre: 'Mesero de demostración uno',
  puesto: 'mesero',
  estado: 'aparto',
}

const SELECCIONADO: TeamSelectionParticipantViewModel = {
  idParticipacion: 5003,
  nombre: 'Mesero de demostración tres',
  puesto: 'barra',
  estado: 'seleccionado',
}

function renderContent(props: Partial<TeamSelectionContentProps> = {}) {
  const onSelectParticipant = props.onSelectParticipant ?? vi.fn()
  render(
    <MemoryRouter>
      <TeamSelectionContent
        evento={EVENTO}
        participants={[CANDIDATO, SELECCIONADO]}
        rowStatuses={{}}
        onSelectParticipant={onSelectParticipant}
        {...props}
      />
    </MemoryRouter>,
  )
  return { onSelectParticipant }
}

describe('TeamSelectionContent — header and summary', () => {
  it('renders exactly one h2 "Selección de equipo" and the event context', () => {
    renderContent()

    expect(
      screen.getAllByRole('heading', { level: 2, name: 'Selección de equipo' }),
    ).toHaveLength(1)
    expect(screen.getByText(EVENTO.titulo)).toBeInTheDocument()
  })

  it('provides a real link back to /eventos/{id}', () => {
    renderContent()

    expect(screen.getByRole('link', { name: /Volver al evento/ })).toHaveAttribute(
      'href',
      '/eventos/1001',
    )
  })

  it('shows cupo from the event, plus live selected/aparto counts', () => {
    renderContent()

    expect(screen.getByText('12')).toBeInTheDocument() // cupoMeseros
    expect(screen.getAllByText('1')).toHaveLength(2) // 1 selected, 1 aparto
  })
})

describe('TeamSelectionContent — candidate list', () => {
  it('shows the applicant name, puesto, and "Apartado" status', () => {
    renderContent()

    expect(screen.getByText(CANDIDATO.nombre)).toBeInTheDocument()
    expect(screen.getByText('Mesero')).toBeInTheDocument()
    expect(screen.getByText('Apartado')).toBeInTheDocument()
  })

  it('shows a "Seleccionar" action only for aparto candidates, not for already-selected participants', () => {
    renderContent()

    expect(
      screen.getByRole('button', { name: `Seleccionar a ${CANDIDATO.nombre}` }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: `Seleccionar a ${SELECCIONADO.nombre}` }),
    ).not.toBeInTheDocument()
  })

  it('renders "no applicants" text when there are no aparto participants', () => {
    renderContent({ participants: [SELECCIONADO] })

    expect(
      screen.getByText('No hay meseros apartados para este evento.'),
    ).toBeInTheDocument()
  })
})

describe('TeamSelectionContent — selection', () => {
  it('invokes the typed callback exactly once with the correct idParticipacion and estado seleccionado', async () => {
    const user = userEvent.setup()
    const { onSelectParticipant } = renderContent()

    await user.click(
      screen.getByRole('button', { name: `Seleccionar a ${CANDIDATO.nombre}` }),
    )

    expect(onSelectParticipant).toHaveBeenCalledOnce()
    expect(onSelectParticipant).toHaveBeenCalledWith({
      idParticipacion: CANDIDATO.idParticipacion,
      estado: 'seleccionado',
    })
  })

  it('disables the action while rowStatus is "selecting"', () => {
    renderContent({ rowStatuses: { [CANDIDATO.idParticipacion]: 'selecting' } })

    expect(
      screen.getByRole('button', { name: `Seleccionar a ${CANDIDATO.nombre}` }),
    ).toBeDisabled()
  })

  it('shows a safe inline message when rowStatus is "error", without exposing technical detail', () => {
    renderContent({ rowStatuses: { [CANDIDATO.idParticipacion]: 'error' } })

    expect(
      screen.getByText('No pudimos seleccionar a este candidato. Intenta de nuevo.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/technical_message/i)).not.toBeInTheDocument()
  })

  it('never renders a deselect, reject, delete, or attendance action anywhere', () => {
    renderContent()

    for (const forbidden of [
      'Deseleccionar',
      'Rechazar',
      'Eliminar participación',
      'Confirmar llegada',
      'Marcar asistencia',
    ]) {
      expect(screen.queryByText(forbidden)).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: forbidden })).not.toBeInTheDocument()
    }
  })
})

describe('TeamSelectionContent — selected list', () => {
  it('shows selected participants with "Seleccionado" status and no action', () => {
    renderContent()

    expect(screen.getByText(SELECCIONADO.nombre)).toBeInTheDocument()
    expect(screen.getByText('Seleccionado')).toBeInTheDocument()
    expect(screen.getByText('Barra')).toBeInTheDocument()
  })

  it('renders "no selected participants yet" text when the selected list is empty', () => {
    renderContent({ participants: [CANDIDATO] })

    expect(
      screen.getByText('Aún no has seleccionado a nadie para este evento.'),
    ).toBeInTheDocument()
  })

  it('a participant already seleccionado never exposes a "Seleccionar" action for itself', () => {
    renderContent({ participants: [SELECCIONADO] })

    expect(screen.queryByRole('button', { name: /Seleccionar/ })).not.toBeInTheDocument()
  })
})

describe('TeamSelectionContent — loading / error / unavailable', () => {
  it('renders exactly the loading state when isLoading is true', () => {
    renderContent({ isLoading: true })

    expect(
      screen.getByRole('status', { name: 'Cargando equipo del evento' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(CANDIDATO.nombre)).not.toBeInTheDocument()
  })

  it('renders the error state (taking priority over the roster) with an injected retry', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    renderContent({ errorMessage: 'Ocurrió un problema inesperado.', onRetry })

    expect(screen.getByRole('alert')).toHaveTextContent('Ocurrió un problema inesperado.')
    expect(screen.queryByText(CANDIDATO.nombre)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('does not render a retry action when onRetry is not supplied', () => {
    renderContent({ errorMessage: 'Error.' })

    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
  })

  it('renders the unavailable event state when evento is null', () => {
    renderContent({ evento: null })

    expect(screen.getByText('No encontramos el evento solicitado.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a eventos' })).toHaveAttribute(
      'href',
      '/eventos',
    )
  })

  it('states are mutually exclusive — loading takes priority over error and the roster', () => {
    renderContent({ isLoading: true, errorMessage: 'Error.' })

    expect(
      screen.getByRole('status', { name: 'Cargando equipo del evento' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
