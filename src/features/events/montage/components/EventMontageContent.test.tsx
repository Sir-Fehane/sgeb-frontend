import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import {
  EventMontageContent,
  type EventMontageContentProps,
} from '@/features/events/montage/components/EventMontageContent'
import type {
  EventTableViewModel,
  MontageParticipantViewModel,
} from '@/features/events/montage/types/montage'
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

const MESA_1_LIBRE: EventTableViewModel = {
  idMesa: 1,
  etiqueta: 'Mesa 1',
  estado: 'libre',
}
const MESA_2_LIBRE: EventTableViewModel = {
  idMesa: 2,
  etiqueta: 'Mesa 2',
  estado: 'libre',
}
const MESA_3_OCUPADA: EventTableViewModel = {
  idMesa: 3,
  etiqueta: 'Mesa 3 VIP',
  estado: 'ocupada',
}
const ALL_TABLES = [MESA_1_LIBRE, MESA_2_LIBRE, MESA_3_OCUPADA]

const CHECKLIST_ITEMS_COMPLETOS = [
  {
    idItem: 1,
    descripcion: 'Colocar mantelería',
    cantidadEsperada: 1,
    cantidad: 1,
    hecho: true,
  },
  {
    idItem: 2,
    descripcion: 'Acomodar sillas',
    cantidadEsperada: 8,
    cantidad: 8,
    hecho: true,
  },
]

const SIN_CHECKLIST: MontageParticipantViewModel = {
  idParticipacion: 5003,
  nombre: 'Mesero de demostración tres',
  puesto: 'mesero',
  assignedTables: [],
}

const CHECKLIST_PENDIENTE: MontageParticipantViewModel = {
  idParticipacion: 6001,
  nombre: 'Mesero de demostración cinco',
  puesto: 'mesero',
  checklist: {
    idChecklistInstancia: 9001,
    nombre: 'Montaje de estación',
    status: 'pending',
    items: [
      {
        idItem: 1,
        descripcion: 'Colocar mantelería',
        cantidadEsperada: 1,
        cantidad: 1,
        hecho: true,
      },
      {
        idItem: 2,
        descripcion: 'Acomodar sillas',
        cantidadEsperada: 8,
        cantidad: 3,
        hecho: false,
      },
    ],
  },
  assignedTables: [],
}

const CHECKLIST_COMPLETO_SIN_APROBAR: MontageParticipantViewModel = {
  idParticipacion: 6002,
  nombre: 'Mesero de demostración seis',
  puesto: 'barra',
  checklist: {
    idChecklistInstancia: 9002,
    nombre: 'Montaje de estación',
    status: 'completed',
    items: CHECKLIST_ITEMS_COMPLETOS,
  },
  assignedTables: [],
}

const CHECKLIST_APROBADO_SIN_MESA: MontageParticipantViewModel = {
  idParticipacion: 7001,
  nombre: 'Mesero de demostración doce',
  puesto: 'mesero',
  checklist: {
    idChecklistInstancia: 9003,
    nombre: 'Montaje de estación',
    status: 'approved',
    items: CHECKLIST_ITEMS_COMPLETOS,
  },
  assignedTables: [],
}

const CHECKLIST_APROBADO_CON_MESA: MontageParticipantViewModel = {
  idParticipacion: 7002,
  nombre: 'Mesero de demostración trece',
  puesto: 'barra',
  checklist: {
    idChecklistInstancia: 9004,
    nombre: 'Montaje de estación',
    status: 'approved',
    items: CHECKLIST_ITEMS_COMPLETOS,
  },
  assignedTables: [{ idAsignacion: 1, mesa: MESA_3_OCUPADA }],
}

const ALL_PARTICIPANTS = [
  SIN_CHECKLIST,
  CHECKLIST_PENDIENTE,
  CHECKLIST_COMPLETO_SIN_APROBAR,
  CHECKLIST_APROBADO_SIN_MESA,
  CHECKLIST_APROBADO_CON_MESA,
]

function renderContent(props: Partial<EventMontageContentProps> = {}) {
  return render(
    <MemoryRouter>
      <EventMontageContent
        evento={EVENTO}
        isLoading={false}
        participants={ALL_PARTICIPANTS}
        tables={ALL_TABLES}
        checklistApprovalStatuses={{}}
        onApproveChecklist={vi.fn()}
        onAssignTable={vi.fn()}
        onReleaseAssignment={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  )
}

describe('EventMontageContent — header', () => {
  it('renders exactly one h2 "Montaje y asignación de mesas"', () => {
    renderContent()

    expect(
      screen.getAllByRole('heading', { level: 2, name: 'Montaje y asignación de mesas' }),
    ).toHaveLength(1)
  })

  it('provides a real link back to /eventos/{id}', () => {
    renderContent()

    expect(screen.getByRole('link', { name: /Volver al evento/ })).toHaveAttribute(
      'href',
      '/eventos/1001',
    )
  })
})

describe('EventMontageContent — table availability', () => {
  it('shows free tables and occupied tables textually, never relying on color alone', () => {
    renderContent()

    const tablesSection = screen.getByText('Disponibilidad de mesas').closest('section')
    expect(tablesSection).toHaveTextContent('Mesa 1')
    expect(tablesSection).toHaveTextContent('Libre')
    expect(tablesSection).toHaveTextContent('Mesa 3 VIP')
    expect(tablesSection).toHaveTextContent('Ocupada')
  })

  it('never renders codigo_qr or token_comensal anywhere', () => {
    renderContent()

    const rendered = document.body.textContent ?? ''
    expect(rendered).not.toMatch(/codigo_qr/i)
    expect(rendered).not.toMatch(/token_comensal/i)
    expect(rendered).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
    )
  })

  it('offers no QR regeneration action', () => {
    renderContent()

    expect(screen.queryByRole('button', { name: /QR/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/regenerar/i)).not.toBeInTheDocument()
  })
})

describe('EventMontageContent — checklist states', () => {
  it('shows a participant with no checklist instance safely', () => {
    renderContent()

    const row = screen.getByText(SIN_CHECKLIST.nombre).closest('li')
    expect(row).toHaveTextContent('checklist de montaje instanciado')
  })

  it('shows the pending state with correct item progress, no fake captain override', () => {
    renderContent()

    const row = screen.getByText(CHECKLIST_PENDIENTE.nombre).closest('li')
    expect(row).toHaveTextContent('Checklist pendiente')
    expect(row).toHaveTextContent('1 de 2 ítems completos')
    expect(row).toHaveTextContent('Colocar mantelería')
    expect(row).toHaveTextContent('Acomodar sillas')
    expect(
      within(row as HTMLElement).queryByRole('button', { name: /Aprobar checklist/ }),
    ).not.toBeInTheDocument()
  })

  it('shows the completed-but-not-approved state with an enabled approve action', () => {
    renderContent()

    const row = screen.getByText(CHECKLIST_COMPLETO_SIN_APROBAR.nombre).closest('li')
    expect(row).toHaveTextContent('Checklist completo')
    expect(row).toHaveTextContent('2 de 2 ítems completos')
    const approveButton = within(row as HTMLElement).getByRole('button', {
      name: /Aprobar checklist/,
    })
    expect(approveButton).toBeEnabled()
  })

  it('shows the approved state with no approve button (already approved)', () => {
    renderContent()

    const row = screen.getByText(CHECKLIST_APROBADO_SIN_MESA.nombre).closest('li')
    expect(row).toHaveTextContent('Checklist aprobado')
    expect(
      within(row as HTMLElement).queryByRole('button', { name: /Aprobar checklist/ }),
    ).not.toBeInTheDocument()
  })

  it('invokes onApproveChecklist with the exact idParticipacion and idChecklistInstancia', async () => {
    const user = userEvent.setup()
    const onApproveChecklist = vi.fn()
    renderContent({ onApproveChecklist })

    const row = screen.getByText(CHECKLIST_COMPLETO_SIN_APROBAR.nombre).closest('li')
    await user.click(
      within(row as HTMLElement).getByRole('button', { name: /Aprobar checklist/ }),
    )

    expect(onApproveChecklist).toHaveBeenCalledWith({
      idParticipacion: 6002,
      idChecklistInstancia: 9002,
    })
  })

  it('shows the approve button as loading/disabled while this participant is approving', () => {
    renderContent({
      checklistApprovalStatuses: {
        [CHECKLIST_COMPLETO_SIN_APROBAR.idParticipacion]: 'approving',
      },
    })

    const row = screen.getByText(CHECKLIST_COMPLETO_SIN_APROBAR.nombre).closest('li')
    expect(
      within(row as HTMLElement).getByRole('button', { name: /Aprobar checklist/ }),
    ).toBeDisabled()
  })

  it('shows the backend-approved error message inline when approval fails, never technical_message', () => {
    renderContent({
      checklistApprovalStatuses: {
        [CHECKLIST_COMPLETO_SIN_APROBAR.idParticipacion]: 'error',
      },
      checklistApprovalErrorMessages: {
        [CHECKLIST_COMPLETO_SIN_APROBAR.idParticipacion]:
          'Este checklist ya no está disponible para aprobar.',
      },
    })

    const row = screen.getByText(CHECKLIST_COMPLETO_SIN_APROBAR.nombre).closest('li')
    expect(row).toHaveTextContent('Este checklist ya no está disponible para aprobar.')
  })
})

describe('EventMontageContent — assignment prerequisite', () => {
  it('is unavailable with a clear reason when checklist is not approved (no checklist)', () => {
    renderContent()

    const row = screen.getByText(SIN_CHECKLIST.nombre).closest('li')
    expect(row).toHaveTextContent(
      'Requiere aprobar el checklist de montaje de este mesero antes de asignar una mesa.',
    )
    expect(within(row as HTMLElement).queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('is unavailable with a clear reason when checklist is pending', () => {
    renderContent()

    const row = screen.getByText(CHECKLIST_PENDIENTE.nombre).closest('li')
    expect(row).toHaveTextContent(
      'Requiere aprobar el checklist de montaje de este mesero',
    )
    expect(within(row as HTMLElement).queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('is unavailable with a clear reason when checklist is completed but not approved', () => {
    renderContent()

    const row = screen.getByText(CHECKLIST_COMPLETO_SIN_APROBAR.nombre).closest('li')
    expect(row).toHaveTextContent(
      'Requiere aprobar el checklist de montaje de este mesero',
    )
    expect(within(row as HTMLElement).queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('is available only once the checklist is approved', () => {
    renderContent()

    const row = screen.getByText(CHECKLIST_APROBADO_SIN_MESA.nombre).closest('li')
    expect(within(row as HTMLElement).getByRole('combobox')).toBeInTheDocument()
    expect(
      within(row as HTMLElement).getByRole('button', { name: /Asignar mesa/ }),
    ).toBeInTheDocument()
  })
})

describe('EventMontageContent — table assignment action', () => {
  it('only lists free tables in the select — the occupied table is not an option', () => {
    renderContent()

    const row = screen
      .getByText(CHECKLIST_APROBADO_SIN_MESA.nombre)
      .closest('li') as HTMLElement
    const select = within(row).getByRole('combobox')
    const optionLabels = within(select)
      .getAllByRole('option')
      .map((o) => o.textContent)

    expect(optionLabels).toContain('Mesa 1')
    expect(optionLabels).toContain('Mesa 2')
    expect(optionLabels).not.toContain('Mesa 3 VIP')
  })

  it('the assign button is disabled until a table is chosen', () => {
    renderContent()

    const row = screen
      .getByText(CHECKLIST_APROBADO_SIN_MESA.nombre)
      .closest('li') as HTMLElement
    expect(within(row).getByRole('button', { name: /Asignar mesa/ })).toBeDisabled()
  })

  it('invokes onAssignTable with the exact idParticipacion and id_mesa once a table is chosen', async () => {
    const user = userEvent.setup()
    const onAssignTable = vi.fn()
    renderContent({ onAssignTable })

    const row = screen
      .getByText(CHECKLIST_APROBADO_SIN_MESA.nombre)
      .closest('li') as HTMLElement
    await user.selectOptions(within(row).getByRole('combobox'), '1')
    await user.click(within(row).getByRole('button', { name: /Asignar mesa/ }))

    expect(onAssignTable).toHaveBeenCalledWith({ idParticipacion: 7001, idMesa: 1 })
  })

  it('shows "no free tables" text when every table is occupied', () => {
    renderContent({ tables: [MESA_3_OCUPADA] })

    const row = screen.getByText(CHECKLIST_APROBADO_SIN_MESA.nombre).closest('li')
    expect(row).toHaveTextContent('No hay mesas libres disponibles.')
    expect(within(row as HTMLElement).queryByRole('combobox')).not.toBeInTheDocument()
  })
})

describe('EventMontageContent — assigned table / release action', () => {
  it('shows the assigned table for a participant who already has one', () => {
    renderContent()

    const row = screen.getByText(CHECKLIST_APROBADO_CON_MESA.nombre).closest('li')
    expect(row).toHaveTextContent('Mesa 3 VIP')
  })

  it('shows "sin mesa asignada" safely for an unassigned participant', () => {
    renderContent()

    const row = screen.getByText(CHECKLIST_APROBADO_SIN_MESA.nombre).closest('li')
    expect(row).toHaveTextContent('Sin mesa asignada.')
  })

  it('invokes onReleaseAssignment with the exact idAsignacion', async () => {
    const user = userEvent.setup()
    const onReleaseAssignment = vi.fn()
    renderContent({ onReleaseAssignment })

    const row = screen
      .getByText(CHECKLIST_APROBADO_CON_MESA.nombre)
      .closest('li') as HTMLElement
    await user.click(within(row).getByRole('button', { name: /Liberar/ }))

    expect(onReleaseAssignment).toHaveBeenCalledWith({ idAsignacion: 1 })
  })

  it('offers no single-step "change/reassign table" action — only release and assign exist', () => {
    renderContent()

    expect(
      screen.queryByRole('button', { name: /Cambiar mesa/i }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Reasignar/i })).not.toBeInTheDocument()
  })
})

describe('EventMontageContent — participants', () => {
  it('shows participant identity and puesto', () => {
    renderContent()

    for (const participant of ALL_PARTICIPANTS) {
      const row = screen.getByText(participant.nombre).closest('li')
      expect(row).toHaveTextContent(participant.puesto === 'mesero' ? 'Mesero' : 'Barra')
    }
  })
})

describe('EventMontageContent — summary', () => {
  it('computes correct totals purely from the participants/tables lists', () => {
    renderContent()

    const summarySection = screen.getByText('Resumen').closest('section')
    expect(summarySection).toHaveTextContent('5') // meseros total
    expect(summarySection).toHaveTextContent('2 de 5') // checklist aprobado
    expect(summarySection).toHaveTextContent('2 de 3') // mesas libres
    expect(summarySection).toHaveTextContent('1 de 5') // con mesa asignada
  })
})

describe('EventMontageContent — empty / loading / error / unavailable', () => {
  it('renders "no selected participants" text when the list is empty', () => {
    renderContent({ participants: [] })

    expect(
      screen.getByText('Aún no hay meseros seleccionados para este evento.'),
    ).toBeInTheDocument()
  })

  it('renders "no tables" text when the table list is empty', () => {
    renderContent({ tables: [] })

    expect(
      screen.getByText('Este evento aún no tiene mesas registradas.'),
    ).toBeInTheDocument()
  })

  it('renders exactly the loading state when isLoading is true', () => {
    renderContent({ isLoading: true })

    expect(
      screen.getByRole('status', { name: 'Cargando montaje y asignación de mesas' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Resumen')).not.toBeInTheDocument()
  })

  it('renders the error state (taking priority over evento) with an injected retry', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    renderContent({ errorMessage: 'No se pudo cargar el montaje.', onRetry })

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar el montaje.')
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('does not render a retry action when onRetry is not supplied', () => {
    renderContent({ errorMessage: 'No se pudo cargar el montaje.', onRetry: undefined })

    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
  })

  it('renders the unavailable state when evento is null', () => {
    renderContent({ evento: null })

    expect(screen.getByText('No encontramos el evento solicitado.')).toBeInTheDocument()
  })
})

describe('EventMontageContent — scope negatives', () => {
  it('never exposes any attendance/arrival-confirmation actions or wording', () => {
    renderContent()

    for (const forbidden of [
      'Confirmar llegada',
      'Marcar asistencia',
      'Usar Face ID',
      'Usar huella',
      'Tomar ubicación',
      'Reintentar GPS',
    ]) {
      expect(screen.queryByText(forbidden)).not.toBeInTheDocument()
    }
  })

  it('never exposes Cubaitor, payment, or event-closing actions', () => {
    renderContent()

    for (const forbidden of [/Cubaitor/i, /Pagar/i, /Aprobar pago/i, /Cerrar evento/i]) {
      expect(screen.queryByText(forbidden)).not.toBeInTheDocument()
    }
  })

  it('never exposes a checklist-reopen or captain-override action', () => {
    renderContent()

    expect(
      screen.queryByRole('button', { name: /Reabrir checklist/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Anular aprobación/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Forzar aprobación/i }),
    ).not.toBeInTheDocument()
  })
})
