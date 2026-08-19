import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import {
  LiveOperationsContent,
  type LiveOperationsContentProps,
} from '@/features/events/live-operations/components/LiveOperationsContent'
import type { LiveOperationsParticipantViewModel } from '@/features/events/live-operations/types/liveOperations'
import type { EventDetailViewModel } from '@/features/events/types/event'

const EVENTO: EventDetailViewModel = {
  idEvento: 1001,
  idSalon: 1,
  titulo: 'Evento de demostración — boda',
  tipo: 'social',
  estado: 'en_curso',
  salonNombre: 'Salón Roble',
  fecha: '2026-09-12',
  horaPresentacion: '16:00',
  inicio: '2026-09-12T18:00:00',
  cupoMeseros: 12,
  numMesas: 20,
  tarifaPorMesero: 450,
  radioGeocercaM: 150,
}

const APARTADO: LiveOperationsParticipantViewModel = {
  idParticipacion: 5001,
  nombre: 'Mesero apartado',
  puesto: 'mesero',
  estado: 'aparto',
}

const ASIGNADO: LiveOperationsParticipantViewModel = {
  idParticipacion: 5002,
  nombre: 'Mesero asignado',
  puesto: 'mesero',
  estado: 'asignado',
}

const VINCULADO: LiveOperationsParticipantViewModel = {
  idParticipacion: 5003,
  nombre: 'Mesero vinculado',
  puesto: 'mesero',
  estado: 'vinculo',
}

const SALIDA: LiveOperationsParticipantViewModel = {
  idParticipacion: 5004,
  nombre: 'Mesero con salida',
  puesto: 'barra',
  estado: 'salida',
}

function renderContent(props: Partial<LiveOperationsContentProps> = {}) {
  const onMarkSalida = props.onMarkSalida ?? vi.fn()
  render(
    <MemoryRouter>
      <LiveOperationsContent
        evento={EVENTO}
        participants={[APARTADO, ASIGNADO, VINCULADO, SALIDA]}
        rowStatuses={{}}
        onMarkSalida={onMarkSalida}
        {...props}
      />
    </MemoryRouter>,
  )
  return { onMarkSalida }
}

describe('LiveOperationsContent — header', () => {
  it('renders exactly one h2 "Operación en vivo" and the event context', () => {
    renderContent()

    expect(
      screen.getAllByRole('heading', { level: 2, name: 'Operación en vivo' }),
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
})

describe('LiveOperationsContent — real participation state machine', () => {
  it('shows every participant with its real, distinct estado label — never bucketed', () => {
    renderContent()

    expect(screen.getByText('Apartado')).toBeInTheDocument()
    expect(screen.getByText('Asignado a mesa')).toBeInTheDocument()
    expect(screen.getByText('Vinculado')).toBeInTheDocument()
    expect(screen.getByText('Salida registrada')).toBeInTheDocument()
  })

  it('shows a "Dar salida" action only for the vinculo participant', () => {
    renderContent()

    expect(
      screen.getByRole('button', { name: `Dar salida a ${VINCULADO.nombre}` }),
    ).toBeInTheDocument()
  })

  it('never exposes a "Dar salida" action for aparto/seleccionado/confirmo_asistencia/confirmo_llegada/asignado participants', () => {
    renderContent()

    expect(
      screen.queryByRole('button', { name: `Dar salida a ${APARTADO.nombre}` }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: `Dar salida a ${ASIGNADO.nombre}` }),
    ).not.toBeInTheDocument()
  })

  it('never exposes a "Dar salida" action for an already-salida participant — terminal, read-only', () => {
    renderContent()

    expect(
      screen.queryByRole('button', { name: `Dar salida a ${SALIDA.nombre}` }),
    ).not.toBeInTheDocument()
  })

  it('never renders a rollback/undo/cancel action for salida', () => {
    renderContent()

    for (const forbidden of [
      'Deshacer salida',
      'Cancelar salida',
      'Revertir',
      'Reingresar',
    ]) {
      expect(screen.queryByText(forbidden)).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: forbidden })).not.toBeInTheDocument()
    }
  })

  it('renders "no participants" text when the roster is empty', () => {
    renderContent({ participants: [] })

    expect(
      screen.getByText('No hay participantes registrados para este evento.'),
    ).toBeInTheDocument()
  })
})

describe('LiveOperationsContent — mark salida action', () => {
  it('invokes the typed callback exactly once with the correct idParticipacion', async () => {
    const user = userEvent.setup()
    const { onMarkSalida } = renderContent()

    await user.click(
      screen.getByRole('button', { name: `Dar salida a ${VINCULADO.nombre}` }),
    )

    expect(onMarkSalida).toHaveBeenCalledOnce()
    expect(onMarkSalida).toHaveBeenCalledWith({
      idParticipacion: VINCULADO.idParticipacion,
    })
  })

  it('disables the action while rowStatus is "marking" — duplicate-submit protection', () => {
    renderContent({ rowStatuses: { [VINCULADO.idParticipacion]: 'marking' } })

    expect(
      screen.getByRole('button', { name: `Dar salida a ${VINCULADO.nombre}` }),
    ).toBeDisabled()
  })

  it('shows a safe inline message when rowStatus is "error" (e.g. SGEB-4011), without exposing technical detail', () => {
    renderContent({
      rowStatuses: { [VINCULADO.idParticipacion]: 'error' },
      rowErrorMessages: {
        [VINCULADO.idParticipacion]:
          'Esta acción no está permitida en el estado actual. Actualiza la pantalla.',
      },
    })

    expect(
      screen.getByText(
        'Esta acción no está permitida en el estado actual. Actualiza la pantalla.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/technical_message/i)).not.toBeInTheDocument()
  })
})

describe('LiveOperationsContent — loading / error / unavailable', () => {
  it('renders exactly the loading state when isLoading is true', () => {
    renderContent({ isLoading: true })

    expect(
      screen.getByRole('status', { name: 'Cargando operación en vivo' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(VINCULADO.nombre)).not.toBeInTheDocument()
  })

  it('renders the error state (taking priority over the roster) with an injected retry', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    renderContent({ errorMessage: 'Ocurrió un problema inesperado.', onRetry })

    expect(screen.getByRole('alert')).toHaveTextContent('Ocurrió un problema inesperado.')
    expect(screen.queryByText(VINCULADO.nombre)).not.toBeInTheDocument()

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
      screen.getByRole('status', { name: 'Cargando operación en vivo' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('LiveOperationsContent — out-of-scope boundaries', () => {
  it('never renders a finalize-event, payment, montage, or comanda action', () => {
    renderContent()

    for (const forbidden of [
      'Finalizar evento',
      'Calcular pagos',
      'Marcar pagado',
      'Aprobar checklist',
      'Asignar mesa',
      'Subir comanda',
    ]) {
      expect(screen.queryByText(forbidden)).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: forbidden })).not.toBeInTheDocument()
    }
  })
})
