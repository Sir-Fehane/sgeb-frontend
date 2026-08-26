import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import type { ChecklistTemplateViewModel } from '@/features/checklists/types/checklists'
import {
  LiveOperationsContent,
  type LiveOperationsContentProps,
} from '@/features/events/live-operations/components/LiveOperationsContent'
import type {
  ClosureChecklistViewModel,
  LiveOperationsParticipantViewModel,
} from '@/features/events/live-operations/types/liveOperations'
import type { EventDetailViewModel } from '@/features/events/types/event'

const EVENTO: EventDetailViewModel = {
  idEvento: 1001,
  idSalon: 1,
  capitan: {
    uuidUsuario: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    nombre: 'Capitán',
    apellidoPaterno: 'Prueba',
    apellidoMaterno: null,
    correo: 'capitan.prueba@example.com',
  },
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

/**
 * A `vinculo` participant whose exit checklist is complete and approved —
 * the one state where "Dar salida" is actually enabled under the pinned
 * backend's `SGEB-4027` gate. Used by tests below whose real subject is
 * state-machine/row-status behavior (click wiring, marking/error disable),
 * not checklist gating itself — those need a participant the button is
 * genuinely clickable for.
 */
const APPROVED_CHECKLIST: ClosureChecklistViewModel = {
  idChecklistInstancia: 901,
  idChecklist: 30,
  nombre: 'Checklist de salida — salón',
  status: 'approved',
  aprobadoEn: '2026-08-26T20:00:00.000Z',
  pendientes: 0,
  items: [
    {
      idItem: 300,
      descripcion: 'Recoger mantelería',
      cantidadEsperada: 1,
      cantidad: 1,
      hecho: true,
    },
  ],
}

const VINCULADO_LISTO: LiveOperationsParticipantViewModel = {
  ...VINCULADO,
  closureChecklist: APPROVED_CHECKLIST,
}

function renderContent(props: Partial<LiveOperationsContentProps> = {}) {
  const onMarkSalida = props.onMarkSalida ?? vi.fn()
  const onApproveClosureChecklist = props.onApproveClosureChecklist ?? vi.fn()
  render(
    <MemoryRouter>
      <LiveOperationsContent
        evento={EVENTO}
        participants={[APARTADO, ASIGNADO, VINCULADO_LISTO, SALIDA]}
        rowStatuses={{}}
        onMarkSalida={onMarkSalida}
        onApproveClosureChecklist={onApproveClosureChecklist}
        {...props}
      />
    </MemoryRouter>,
  )
  return { onMarkSalida, onApproveClosureChecklist }
}

describe('LiveOperationsContent — header', () => {
  it('renders exactly one h2 "Control de salida" and the event context', () => {
    renderContent()

    expect(
      screen.getAllByRole('heading', { level: 2, name: 'Control de salida' }),
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
      screen.getByRole('status', { name: 'Cargando control de salida' }),
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
      screen.getByRole('status', { name: 'Cargando control de salida' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('LiveOperationsContent — out-of-scope boundaries', () => {
  it('never renders a finalize-event, payment, montage table-assignment, or comanda action', () => {
    renderContent()

    for (const forbidden of [
      'Finalizar evento',
      'Calcular pagos',
      'Marcar pagado',
      'Asignar mesa',
      'Subir comanda',
    ]) {
      expect(screen.queryByText(forbidden)).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: forbidden })).not.toBeInTheDocument()
    }
  })
})

const CIERRE_TEMPLATE: ChecklistTemplateViewModel = {
  idChecklist: 30,
  nombre: 'Checklist de salida — salón',
  tipo: 'cierre',
  activo: true,
  items: [
    {
      idItem: 300,
      descripcion: 'Recoger mantelería',
      cantidadEsperada: 1,
      orden: 1,
      activo: true,
    },
  ],
}

const PENDING_CHECKLIST: ClosureChecklistViewModel = {
  idChecklistInstancia: 900,
  idChecklist: 30,
  nombre: 'Checklist de salida — salón',
  status: 'pending',
  aprobadoEn: null,
  pendientes: 1,
  items: [
    {
      idItem: 300,
      descripcion: 'Recoger mantelería',
      cantidadEsperada: 1,
      cantidad: 0,
      hecho: false,
    },
  ],
}

const COMPLETED_CHECKLIST: ClosureChecklistViewModel = {
  ...PENDING_CHECKLIST,
  status: 'completed',
  pendientes: 0,
  items: [
    {
      idItem: 300,
      descripcion: 'Recoger mantelería',
      cantidadEsperada: 1,
      cantidad: 1,
      hecho: true,
    },
  ],
}

describe('LiveOperationsContent — exit checklist gates "Dar salida" (SGEB-4027)', () => {
  it('offers "Asignar checklist" for a vinculo participant with no exit checklist yet, and disables "Dar salida" with a reason', () => {
    renderContent({
      participants: [VINCULADO],
      availableClosureChecklistTemplates: [CIERRE_TEMPLATE],
      onInstantiateClosureChecklist: vi.fn(),
    })

    expect(
      screen.getByRole('button', {
        name: `Asignar checklist de salida a ${VINCULADO.nombre}`,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: `Dar salida a ${VINCULADO.nombre}` }),
    ).toBeDisabled()
    expect(
      screen.getByText('Asigna un checklist de salida antes de registrar la salida.'),
    ).toBeInTheDocument()
  })

  it('calls onInstantiateClosureChecklist with the selected template when "Asignar checklist" is clicked', async () => {
    const user = userEvent.setup()
    const onInstantiateClosureChecklist = vi.fn()
    renderContent({
      participants: [VINCULADO],
      availableClosureChecklistTemplates: [CIERRE_TEMPLATE],
      onInstantiateClosureChecklist,
    })

    await user.click(
      screen.getByRole('button', {
        name: `Asignar checklist de salida a ${VINCULADO.nombre}`,
      }),
    )

    expect(onInstantiateClosureChecklist).toHaveBeenCalledWith({
      idParticipacion: VINCULADO.idParticipacion,
      idChecklist: CIERRE_TEMPLATE.idChecklist,
    })
  })

  it('disables "Dar salida" with a reason when the exit checklist is pending (incomplete)', () => {
    renderContent({
      participants: [{ ...VINCULADO, closureChecklist: PENDING_CHECKLIST }],
    })

    expect(
      screen.getByText('El mesero debe completar su checklist de salida.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: `Dar salida a ${VINCULADO.nombre}` }),
    ).toBeDisabled()
  })

  it('disables "Dar salida" with a reason when the exit checklist is complete but not yet approved', () => {
    renderContent({
      participants: [{ ...VINCULADO, closureChecklist: COMPLETED_CHECKLIST }],
    })

    expect(
      screen.getByText('El checklist de salida está pendiente de aprobación.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: `Dar salida a ${VINCULADO.nombre}` }),
    ).toBeDisabled()
  })

  it('offers "Aprobar checklist" once the exit checklist is completed', async () => {
    const user = userEvent.setup()
    const onApproveClosureChecklist = vi.fn()
    renderContent({
      participants: [{ ...VINCULADO, closureChecklist: COMPLETED_CHECKLIST }],
      onApproveClosureChecklist,
    })

    await user.click(
      screen.getByRole('button', {
        name: `Aprobar checklist de salida de ${VINCULADO.nombre}`,
      }),
    )

    expect(onApproveClosureChecklist).toHaveBeenCalledWith({
      idParticipacion: VINCULADO.idParticipacion,
      idChecklistInstancia: COMPLETED_CHECKLIST.idChecklistInstancia,
    })
  })

  it('enables "Dar salida" once the real, persisted checklist status is "approved" — no local approvalStatus flag needed', () => {
    renderContent({
      participants: [VINCULADO_LISTO],
    })

    expect(screen.getByText('Checklist de salida aprobado')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', {
        name: `Aprobar checklist de salida de ${VINCULADO.nombre}`,
      }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: `Dar salida a ${VINCULADO.nombre}` }),
    ).not.toBeDisabled()
  })

  it('gates "Dar salida" per participant based on real checklist status — only the approved one is enabled', () => {
    renderContent({
      participants: [
        { ...VINCULADO, idParticipacion: 6000 },
        { ...VINCULADO, idParticipacion: 6001, closureChecklist: PENDING_CHECKLIST },
        { ...VINCULADO, idParticipacion: 6002, closureChecklist: COMPLETED_CHECKLIST },
        { ...VINCULADO, idParticipacion: 6003, closureChecklist: APPROVED_CHECKLIST },
      ],
    })

    const buttons = screen.getAllByRole('button', { name: /^Dar salida a/ })
    expect(buttons).toHaveLength(4)
    expect(buttons[0]).toBeDisabled()
    expect(buttons[1]).toBeDisabled()
    expect(buttons[2]).toBeDisabled()
    expect(buttons[3]).not.toBeDisabled()
  })
})
