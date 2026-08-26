import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import {
  EventClosureContent,
  type EventClosureContentProps,
} from '@/features/events/closure/components/EventClosureContent'
import type {
  EventClosureReadinessViewModel,
  MermaReportViewModel,
} from '@/features/events/closure/types/closure'
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

const READINESS_BLOCKED: EventClosureReadinessViewModel = {
  eventoFinalizado: false,
  participacionesTotal: 8,
  participacionesSinSalida: 3,
  meserosSinClabeVigente: 2,
  listo: false,
}

const READINESS_READY: EventClosureReadinessViewModel = {
  eventoFinalizado: true,
  participacionesTotal: 5,
  participacionesSinSalida: 0,
  meserosSinClabeVigente: 0,
  listo: true,
}

const MERMA_REPORTS: readonly MermaReportViewModel[] = [
  {
    idReporte: 1,
    fecha: '2026-09-12T23:10:00Z',
    observaciones: 'Se rompieron al recoger el salón.',
    detalles: [
      {
        tipo: 'copa_rota',
        descripcion: 'Copas de la barra',
        cantidad: 4,
        costoEstimado: 320,
      },
      { tipo: 'plato_roto', descripcion: null, cantidad: 2, costoEstimado: 150 },
    ],
  },
]

function renderContent(props: Partial<EventClosureContentProps> = {}) {
  return render(
    <MemoryRouter>
      <EventClosureContent
        evento={EVENTO}
        isLoading={false}
        readiness={READINESS_BLOCKED}
        mermaReports={[]}
        onSubmitWasteReport={vi.fn().mockResolvedValue(undefined)}
        canFinalizeEvento={false}
        onFinalizeEvento={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  )
}

describe('EventClosureContent — header', () => {
  it('renders exactly one h2 "Cierre del evento"', () => {
    renderContent()

    expect(
      screen.getAllByRole('heading', { level: 2, name: 'Cierre del evento' }),
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

describe('EventClosureContent — readiness, blocked fixture', () => {
  it('shows the event as pending finalization, never "Error"/"Pago fallido"', () => {
    renderContent({ readiness: READINESS_BLOCKED })

    expect(screen.getByText('Evento pendiente de finalizar')).toBeInTheDocument()
    expect(screen.queryByText(/^Error$/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Pago fallido/)).not.toBeInTheDocument()
  })

  it('shows the exact participaciones total', () => {
    renderContent({ readiness: READINESS_BLOCKED })

    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('shows the exact participacionesSinSalida count', () => {
    renderContent({ readiness: READINESS_BLOCKED })

    expect(screen.getByText('3 participación(es) pendiente(s)')).toBeInTheDocument()
  })

  it('shows the exact meserosSinClabeVigente count', () => {
    renderContent({ readiness: READINESS_BLOCKED })

    expect(
      screen.getByText('2 mesero(s) sin datos bancarios vigentes'),
    ).toBeInTheDocument()
  })

  it('shows "No listo para calcular pagos" as the overall status', () => {
    renderContent({ readiness: READINESS_BLOCKED })

    expect(screen.getByText('No listo para calcular pagos')).toBeInTheDocument()
  })

  it('never derives fictional participant/mesero identities from the aggregate counts', () => {
    renderContent({ readiness: READINESS_BLOCKED })

    // Only the documented counts appear — no per-person rows/names anywhere
    // in the readiness section, and exactly the 5 documented fields render
    // as dt/dd pairs (no invented sixth blocker, no per-person expansion).
    const readinessSection = screen.getByText('Estado del cierre').closest('section')
    expect(readinessSection?.querySelectorAll('li').length ?? 0).toBe(0)
    expect(readinessSection?.querySelectorAll('dt').length ?? 0).toBe(5)
    expect(screen.queryByText(/Mesero de demostración/)).not.toBeInTheDocument()
  })
})

describe('EventClosureContent — readiness, ready fixture', () => {
  it('shows the event as finalized', () => {
    renderContent({ readiness: READINESS_READY })

    expect(screen.getByText('Completado')).toBeInTheDocument()
  })

  it('shows zero pending exits as "Sin pendientes"', () => {
    renderContent({ readiness: READINESS_READY })

    const readinessSection = screen.getByText('Salidas verificadas').closest('div')
    expect(readinessSection).toHaveTextContent('Sin pendientes')
  })

  it('shows zero banking blockers as "Sin pendientes"', () => {
    renderContent({ readiness: READINESS_READY })

    const readinessSection = screen.getByText('Datos bancarios').closest('div')
    expect(readinessSection).toHaveTextContent('Sin pendientes')
  })

  it('shows "Listo para calcular pagos" as the overall status', () => {
    renderContent({ readiness: READINESS_READY })

    expect(screen.getByText('Listo para calcular pagos')).toBeInTheDocument()
  })
})

describe('EventClosureContent — cleanup / exit checklist pointer', () => {
  it('shows restrained copy plus a real link to Control de salida, with no local mutation control', () => {
    renderContent()

    expect(screen.getByText('Verificación de limpieza')).toBeInTheDocument()
    const cleanupSection = screen.getByText('Verificación de limpieza').closest('section')
    // The one real control is a navigation link (rendered via `Button asChild`,
    // so its accessible role is `link`, not `button`) — no checkbox, no
    // local mutation control lives on this event-level rollup screen; the
    // interactive assign/monitor/approve UI lives on Control de salida
    // (`LiveOperationsClosureChecklistSection`), not duplicated here.
    expect(within(cleanupSection!).queryAllByRole('button')).toHaveLength(0)
    expect(within(cleanupSection!).queryAllByRole('checkbox')).toHaveLength(0)
    expect(
      within(cleanupSection!).getByRole('link', { name: 'Ir a Control de salida' }),
    ).toHaveAttribute('href', `/eventos/${String(EVENTO.idEvento)}/operacion-en-vivo`)
  })

  it('never exposes a local cleanup mutation action', () => {
    renderContent()

    for (const forbidden of [
      'Marcar limpio',
      'Aprobar limpieza',
      'Verificar limpieza',
      'Forzar salida',
      'Confirmar salida',
    ]) {
      expect(screen.queryByRole('button', { name: forbidden })).not.toBeInTheDocument()
    }
  })

  it('never leaks engineering/internal status language into the rendered copy', () => {
    renderContent()

    const cleanupSection = screen.getByText('Verificación de limpieza').closest('section')
    const text = cleanupSection?.textContent?.toLowerCase() ?? ''

    for (const jargon of [
      'contrato',
      'contract',
      'endpoint',
      'api',
      'backend',
      'sgeb-4015',
      'pendiente de definición',
      'no tiene',
      'definida',
    ]) {
      expect(text).not.toContain(jargon)
    }
  })
})

describe('EventClosureContent — existing merma reports', () => {
  it('shows "no reports" text when the list is empty', () => {
    renderContent({ mermaReports: [] })

    expect(
      screen.getByText('Aún no se han registrado reportes de merma para este evento.'),
    ).toBeInTheDocument()
  })

  it('shows populated reports with category labels, quantities, and MXN-formatted costs', () => {
    renderContent({ mermaReports: MERMA_REPORTS })

    const reportsSection = screen
      .getByRole('list', { name: 'Reportes de merma registrados' })
      .closest('section')!

    expect(within(reportsSection).getByText(/Copa rota/)).toBeInTheDocument()
    expect(within(reportsSection).getByText(/Plato roto/)).toBeInTheDocument()
    expect(within(reportsSection).getByText(/\$\s*320\.00/)).toBeInTheDocument()
    expect(within(reportsSection).getByText(/Costo estimado total/)).toBeInTheDocument()
    expect(within(reportsSection).getByText(/\$\s*470\.00/)).toBeInTheDocument()
  })

  it('shows observaciones when present', () => {
    renderContent({ mermaReports: MERMA_REPORTS })

    const reportsSection = screen
      .getByRole('list', { name: 'Reportes de merma registrados' })
      .closest('section')!
    expect(
      within(reportsSection).getByText('Se rompieron al recoger el salón.'),
    ).toBeInTheDocument()
  })
})

describe('EventClosureContent — merma form wiring', () => {
  it('invokes onSubmitWasteReport when the form is submitted', async () => {
    const user = userEvent.setup()
    const onSubmitWasteReport = vi.fn().mockResolvedValue(undefined)
    renderContent({ onSubmitWasteReport })

    await user.selectOptions(
      screen.getByRole('combobox', { name: /Tipo de artículo 1/ }),
      'otro',
    )
    await user.click(screen.getByRole('button', { name: 'Registrar reporte de merma' }))

    await vi.waitFor(() => expect(onSubmitWasteReport).toHaveBeenCalledTimes(1))
  })

  it('shows a safe wasteReportErrorMessage inline near the form, never technical_message', () => {
    renderContent({ wasteReportErrorMessage: 'El evento no está en la etapa requerida.' })

    expect(
      screen.getByText('El evento no está en la etapa requerida.'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/technical_message/)).not.toBeInTheDocument()
  })

  it('renders no form-level error alert when wasteReportErrorMessage is absent', () => {
    renderContent()

    expect(screen.queryByText('No se pudo registrar el reporte')).not.toBeInTheDocument()
  })
})

describe('EventClosureContent — loading / error / unavailable', () => {
  it('renders exactly the loading state when isLoading is true', () => {
    renderContent({ isLoading: true })

    expect(
      screen.getByRole('status', { name: 'Cargando cierre del evento' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Estado del cierre')).not.toBeInTheDocument()
  })

  it('renders the error state (taking priority over evento) with an injected retry', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    renderContent({ errorMessage: 'No se pudo cargar el cierre.', onRetry })

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar el cierre.')
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('does not render a retry action when onRetry is not supplied', () => {
    renderContent({ errorMessage: 'No se pudo cargar el cierre.', onRetry: undefined })

    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
  })

  it('renders the unavailable state when evento is null', () => {
    renderContent({ evento: null })

    expect(screen.getByText('No encontramos el evento solicitado.')).toBeInTheDocument()
  })

  it('renders the unavailable state when readiness is null, even with a valid evento', () => {
    renderContent({ readiness: null })

    expect(screen.getByText('No encontramos el evento solicitado.')).toBeInTheDocument()
  })
})

describe('EventClosureContent — payments boundary', () => {
  it('never exposes a functional payment-calculation action', () => {
    renderContent({ readiness: READINESS_READY })

    expect(
      screen.queryByRole('button', { name: /Calcular pagos/i }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Pagar/i })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Marcar pagado/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Marcar fallido/i }),
    ).not.toBeInTheDocument()
  })

  it('allows the readiness status copy "Listo para calcular pagos" without it being a button', () => {
    renderContent({ readiness: READINESS_READY })

    const statusText = screen.getByText('Listo para calcular pagos')
    expect(statusText.closest('button')).toBeNull()
  })

  it('never exposes CLABE, bank account details, or a reference-bancaria input', () => {
    renderContent({ readiness: READINESS_BLOCKED })

    expect(screen.queryByText(/CLABE/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/referencia bancaria/i)).not.toBeInTheDocument()
  })

  it('never renders a payment row/table', () => {
    renderContent()

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})

describe('EventClosureContent — event finalization wiring', () => {
  it('does not offer "Finalizar evento" when the role cannot finalize', () => {
    renderContent({ evento: { ...EVENTO, estado: 'en_curso' }, canFinalizeEvento: false })

    expect(
      screen.queryByRole('button', { name: 'Finalizar evento' }),
    ).not.toBeInTheDocument()
  })

  it('offers "Finalizar evento" when en_curso and the role can finalize', () => {
    renderContent({ evento: { ...EVENTO, estado: 'en_curso' }, canFinalizeEvento: true })

    expect(screen.getByRole('button', { name: 'Finalizar evento' })).toBeInTheDocument()
  })

  it('never offers "Finalizar evento" for a non-en_curso estado, even when the role can finalize', () => {
    renderContent({ evento: { ...EVENTO, estado: 'publicado' }, canFinalizeEvento: true })

    expect(
      screen.queryByRole('button', { name: 'Finalizar evento' }),
    ).not.toBeInTheDocument()
  })

  it('shows the read-only completed state once finalizado', () => {
    renderContent({
      evento: { ...EVENTO, estado: 'finalizado' },
      canFinalizeEvento: true,
    })

    expect(screen.getByText('Este evento ya fue finalizado.')).toBeInTheDocument()
  })

  it('passes finalizeEventoErrorMessage through to the finalize section, never technical_message', () => {
    renderContent({
      evento: { ...EVENTO, estado: 'en_curso' },
      canFinalizeEvento: true,
      finalizeEventoErrorMessage: 'Esta acción no está permitida en el estado actual.',
    })

    expect(
      screen.getByText('Esta acción no está permitida en el estado actual.'),
    ).toBeInTheDocument()
  })
})

describe('EventClosureContent — W-08 negative scope', () => {
  it('exposes no Cubaitor/Bebidas/Insumo/Dispensado controls', () => {
    renderContent()

    for (const forbidden of [
      /Cubaitor/i,
      /Bebida/i,
      /Insumo/i,
      /Dispensado/i,
      /Envase/i,
    ]) {
      expect(screen.queryByText(forbidden)).not.toBeInTheDocument()
    }
  })
})
