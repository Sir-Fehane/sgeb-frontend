import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import type { EventClosureReadinessViewModel } from '@/features/events/closure/types/closure'
import {
  EventPaymentsContent,
  type EventPaymentsContentProps,
} from '@/features/events/payments/components/EventPaymentsContent'
import type { EventPaymentViewModel } from '@/features/events/payments/types/payments'
import type { EventDetailViewModel } from '@/features/events/types/event'

const EVENTO: EventDetailViewModel = {
  idEvento: 3001,
  idSalon: 1,
  capitan: {
    uuidUsuario: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    nombre: 'Capitán',
    apellidoPaterno: 'Prueba',
    apellidoMaterno: null,
    correo: 'capitan.prueba@example.com',
  },
  titulo: 'Evento de demostración — aniversario finalizado',
  tipo: 'social',
  estado: 'finalizado',
  salonNombre: 'Salón Roble',
  fecha: '2026-05-02',
  horaPresentacion: '17:00',
  inicio: '2026-05-02T19:00:00',
  cupoMeseros: 10,
  numMesas: 15,
  tarifaPorMesero: 440,
  radioGeocercaM: 140,
}

const READINESS_BLOCKED: EventClosureReadinessViewModel = {
  eventoFinalizado: false,
  participacionesTotal: 8,
  participacionesSinSalida: 2,
  meserosSinClabeVigente: 1,
  listo: false,
}

const READINESS_READY: EventClosureReadinessViewModel = {
  eventoFinalizado: true,
  participacionesTotal: 4,
  participacionesSinSalida: 0,
  meserosSinClabeVigente: 0,
  listo: true,
}

const PENDIENTE: EventPaymentViewModel = {
  idPago: 1,
  idParticipacion: 9001,
  nombre: 'Mesero de demostración catorce',
  monto: 440,
  clabeDestinoEnmascarada: '0121…8909',
  estado: 'pendiente',
  referencia: null,
  fechaPago: null,
}

const PAGADO: EventPaymentViewModel = {
  idPago: 2,
  idParticipacion: 9002,
  nombre: 'Mesero de demostración quince',
  monto: 440,
  clabeDestinoEnmascarada: '0233…4471',
  estado: 'pagado',
  referencia: 'REF-000456',
  fechaPago: '2026-05-03T15:30:00Z',
}

const FALLIDO: EventPaymentViewModel = {
  idPago: 3,
  idParticipacion: 9003,
  nombre: 'Mesero de demostración dieciséis',
  monto: 440,
  clabeDestinoEnmascarada: '0198…2210',
  estado: 'fallido',
  referencia: null,
  fechaPago: null,
}

const CANCELADO: EventPaymentViewModel = {
  idPago: 4,
  idParticipacion: 9004,
  nombre: 'Mesero de demostración diecisiete',
  monto: 440,
  clabeDestinoEnmascarada: '0344…7765',
  estado: 'cancelado',
  referencia: null,
  fechaPago: null,
}

const ALL_PAYMENTS = [PENDIENTE, PAGADO, FALLIDO, CANCELADO]

function renderContent(props: Partial<EventPaymentsContentProps> = {}) {
  return render(
    <MemoryRouter>
      <EventPaymentsContent
        canView
        evento={EVENTO}
        isLoading={false}
        readiness={READINESS_READY}
        payments={ALL_PAYMENTS}
        onCalculate={vi.fn().mockResolvedValue(undefined)}
        onMarkPaid={vi.fn().mockResolvedValue(undefined)}
        onMarkFailed={vi.fn().mockResolvedValue(undefined)}
        {...props}
      />
    </MemoryRouter>,
  )
}

describe('EventPaymentsContent — header', () => {
  it('renders exactly one h2 "Pagos"', () => {
    renderContent()

    expect(screen.getAllByRole('heading', { level: 2, name: 'Pagos' })).toHaveLength(1)
  })

  it('provides a real link back to /eventos/{id}', () => {
    renderContent()

    expect(screen.getByRole('link', { name: /Volver al evento/ })).toHaveAttribute(
      'href',
      '/eventos/3001',
    )
  })
})

describe('EventPaymentsContent — closure gating (blocked)', () => {
  it('shows the documented blockers and no enabled calculation control', () => {
    renderContent({ readiness: READINESS_BLOCKED, payments: [] })

    expect(
      screen.getByText('No se pueden calcular los pagos todavía.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Evento pendiente de finalizar')).toBeInTheDocument()
    expect(screen.getByText('2 participación(es) sin salida')).toBeInTheDocument()
    expect(
      screen.getByText('1 mesero(s) sin datos bancarios vigentes'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Calcular pagos/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Recalcular pagos/i }),
    ).not.toBeInTheDocument()
  })

  it('never derives fictional participant rows from the aggregate blocker counts', () => {
    renderContent({ readiness: READINESS_BLOCKED, payments: [] })

    expect(screen.queryByText(/Mesero de demostración/)).not.toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})

describe('EventPaymentsContent — closure gating (ready)', () => {
  it('shows an enabled calculation control and no blocker text', () => {
    renderContent({ readiness: READINESS_READY, payments: [] })

    expect(screen.getByRole('button', { name: 'Calcular pagos' })).toBeEnabled()
    expect(
      screen.queryByText('No se pueden calcular los pagos todavía.'),
    ).not.toBeInTheDocument()
  })

  it('says "Recalcular pagos" once payments already exist', () => {
    renderContent({ readiness: READINESS_READY, payments: ALL_PAYMENTS })

    expect(screen.getByRole('button', { name: 'Recalcular pagos' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Calcular pagos' }),
    ).not.toBeInTheDocument()
  })

  it('invokes onCalculate exactly once per click', async () => {
    const user = userEvent.setup()
    const onCalculate = vi.fn().mockResolvedValue(undefined)
    renderContent({ readiness: READINESS_READY, payments: [], onCalculate })

    await user.click(screen.getByRole('button', { name: 'Calcular pagos' }))

    expect(onCalculate).toHaveBeenCalledTimes(1)
  })
})

describe('EventPaymentsContent — payment states', () => {
  it('renders all four documented states with safe Spanish labels', () => {
    renderContent()

    expect(screen.getByText('Pendiente')).toBeInTheDocument()
    expect(screen.getByText('Pagado')).toBeInTheDocument()
    expect(screen.getByText('Fallido')).toBeInTheDocument()
    expect(screen.getByText('Cancelado')).toBeInTheDocument()
  })
})

describe('EventPaymentsContent — Pago schema presentation', () => {
  it('formats monto as MXN', () => {
    renderContent()

    expect(screen.getAllByText(/\$\s*440\.00/).length).toBeGreaterThan(0)
  })

  it('shows the masked CLABE for every row', () => {
    renderContent()

    expect(screen.getByText('0121…8909')).toBeInTheDocument()
    expect(screen.getByText('0233…4471')).toBeInTheDocument()
  })

  it('shows referencia and fecha only for the pagado row', () => {
    renderContent()

    const table = screen.getByRole('table')
    expect(within(table).getByText('REF-000456')).toBeInTheDocument()

    const pendienteRow = screen.getByText(PENDIENTE.nombre).closest('tr')
    expect(pendienteRow).not.toHaveTextContent('REF-')
  })

  it('never shows idPago or idParticipacion as visible primary content', () => {
    renderContent()

    for (const forbidden of [
      'idPago',
      'idParticipacion',
      'id_pago',
      'id_participacion',
    ]) {
      expect(screen.queryByText(forbidden)).not.toBeInTheDocument()
    }
  })
})

describe('EventPaymentsContent — summary amount semantics', () => {
  it('labels the non-cancelled subtotal "Monto vigente", matching arithmetic that excludes cancelado', () => {
    renderContent()

    expect(screen.getByText('Monto vigente')).toBeInTheDocument()
    // PENDIENTE + PAGADO + FALLIDO (440 each) = 1320; CANCELADO excluded.
    expect(screen.getByText(/\$\s*1,320\.00/)).toBeInTheDocument()
    expect(screen.queryByText('Monto total')).not.toBeInTheDocument()
  })
})

describe('EventPaymentsContent — CLABE security', () => {
  const eighteenDigitPattern = /\d{18}/

  it('never renders an 18-digit raw CLABE anywhere on the page', () => {
    renderContent()

    const rendered = document.body.textContent ?? ''
    expect(rendered).not.toMatch(eighteenDigitPattern)
  })

  it('never renders an editable CLABE input', () => {
    renderContent()

    expect(screen.queryByLabelText(/clabe/i)).not.toBeInTheDocument()
  })
})

describe('EventPaymentsContent — filter', () => {
  it('filters the table to only the selected state', async () => {
    const user = userEvent.setup()
    renderContent()

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Filtrar por estado' }),
      'pagado',
    )

    expect(screen.getByText(PAGADO.nombre)).toBeInTheDocument()
    expect(screen.queryByText(PENDIENTE.nombre)).not.toBeInTheDocument()
    expect(screen.queryByText(FALLIDO.nombre)).not.toBeInTheDocument()
  })

  it('the summary counts are unaffected by the active filter', async () => {
    const user = userEvent.setup()
    renderContent()

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Filtrar por estado' }),
      'pagado',
    )

    const summarySection = screen.getByText('Resumen de pagos').closest('section')
    expect(summarySection).toHaveTextContent('4') // pagos registrados, unfiltered
  })
})

describe('EventPaymentsContent — register-paid action', () => {
  it('only a pendiente payment exposes the register-paid action', () => {
    renderContent()

    expect(
      screen.getByRole('button', {
        name: `Registrar transferencia realizada de ${PENDIENTE.nombre}`,
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', {
        name: `Registrar transferencia realizada de ${PAGADO.nombre}`,
      }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', {
        name: `Registrar transferencia realizada de ${FALLIDO.nombre}`,
      }),
    ).not.toBeInTheDocument()
  })

  it('requires a referencia and rejects invalid characters', async () => {
    const user = userEvent.setup()
    const onMarkPaid = vi.fn().mockResolvedValue(undefined)
    renderContent({ onMarkPaid })

    await user.click(
      screen.getByRole('button', {
        name: `Registrar transferencia realizada de ${PENDIENTE.nombre}`,
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Registrar transferencia' }))

    expect(await screen.findByText('Ingresa la referencia bancaria.')).toBeInTheDocument()
    expect(onMarkPaid).not.toHaveBeenCalled()
  })

  it('calls onMarkPaid with the exact idPago and uppercase-normalized referencia', async () => {
    const user = userEvent.setup()
    const onMarkPaid = vi.fn().mockResolvedValue(undefined)
    renderContent({ onMarkPaid })

    await user.click(
      screen.getByRole('button', {
        name: `Registrar transferencia realizada de ${PENDIENTE.nombre}`,
      }),
    )
    await user.type(screen.getByLabelText(/Referencia bancaria/), 'ref-abc123')
    await user.click(screen.getByRole('button', { name: 'Registrar transferencia' }))

    await vi.waitFor(() => expect(onMarkPaid).toHaveBeenCalledTimes(1))
    expect(onMarkPaid).toHaveBeenCalledWith({ idPago: 1, referencia: 'REF-ABC123' })
  })
})

describe('EventPaymentsContent — register-failed action', () => {
  it('requires a motivo of at least 3 characters', async () => {
    const user = userEvent.setup()
    const onMarkFailed = vi.fn().mockResolvedValue(undefined)
    renderContent({ onMarkFailed })

    await user.click(
      screen.getByRole('button', {
        name: `Registrar transferencia rechazada de ${PENDIENTE.nombre}`,
      }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Registrar transferencia rechazada' }),
    )

    expect(await screen.findByText('Ingresa al menos 3 caracteres.')).toBeInTheDocument()
    expect(onMarkFailed).not.toHaveBeenCalled()
  })

  it('calls onMarkFailed with the exact idPago and motivo', async () => {
    const user = userEvent.setup()
    const onMarkFailed = vi.fn().mockResolvedValue(undefined)
    renderContent({ onMarkFailed })

    await user.click(
      screen.getByRole('button', {
        name: `Registrar transferencia rechazada de ${PENDIENTE.nombre}`,
      }),
    )
    await user.type(screen.getByLabelText(/Motivo/), 'CLABE incorrecta')
    await user.click(
      screen.getByRole('button', { name: 'Registrar transferencia rechazada' }),
    )

    await vi.waitFor(() => expect(onMarkFailed).toHaveBeenCalledTimes(1))
    expect(onMarkFailed).toHaveBeenCalledWith({ idPago: 1, motivo: 'CLABE incorrecta' })
  })

  it('never renders motivo as a persisted field once a payment is fallido', () => {
    renderContent()

    const fallidoRow = screen.getByText(FALLIDO.nombre).closest('tr')
    expect(fallidoRow).not.toHaveTextContent(/motivo/i)
  })
})

describe('EventPaymentsContent — pagado terminal behavior', () => {
  it('shows no action buttons for a pagado row', () => {
    renderContent()

    const pagadoRow = screen.getByText(PAGADO.nombre).closest('tr') as HTMLElement
    expect(within(pagadoRow).queryAllByRole('button')).toHaveLength(0)
  })

  it('never offers an undo/revert action', () => {
    renderContent()

    expect(
      screen.queryByRole('button', { name: /Revertir pago/i }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Reabrir/i })).not.toBeInTheDocument()
  })
})

describe('EventPaymentsContent — fallido recovery behavior', () => {
  it('points to page-level recalculation, offers no direct paid action', () => {
    renderContent()

    const fallidoRow = screen.getByText(FALLIDO.nombre).closest('tr') as HTMLElement
    expect(fallidoRow).toHaveTextContent('Se recalculará en el próximo cálculo de pagos.')
    expect(within(fallidoRow).queryAllByRole('button')).toHaveLength(0)
  })
})

describe('EventPaymentsContent — cancelado behavior', () => {
  it('is visible with no action buttons', () => {
    renderContent()

    const canceladoRow = screen.getByText(CANCELADO.nombre).closest('tr') as HTMLElement
    expect(within(canceladoRow).queryAllByRole('button')).toHaveLength(0)
  })
})

describe('EventPaymentsContent — bulk-retired-contract negatives', () => {
  it('never exposes bulk approval/dispersal actions or the retired endpoint name', () => {
    renderContent()

    for (const forbidden of [
      'Aprobar todos',
      'Aprobar pagos',
      'Dispersar todos',
      'pagos/aprobar',
    ]) {
      expect(screen.queryByText(forbidden)).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: forbidden })).not.toBeInTheDocument()
    }
  })
})

describe('EventPaymentsContent — manual-transfer ownership', () => {
  it('never implies SGEB performs the transfer', () => {
    renderContent()

    for (const forbidden of [
      /Conectar banco/i,
      /Transferir desde SGEB/i,
      /Enviar transferencia/i,
      /Procesar con banco/i,
      /Pasarela/i,
      /Stripe/i,
      /SPEI API/i,
    ]) {
      expect(screen.queryByText(forbidden)).not.toBeInTheDocument()
    }
  })
})

describe('EventPaymentsContent — loading / error / unavailable', () => {
  it('renders exactly the loading state when isLoading is true', () => {
    renderContent({ isLoading: true })

    expect(
      screen.getByRole('status', { name: 'Cargando pagos del evento' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Resumen de pagos')).not.toBeInTheDocument()
  })

  it('renders the error state with an injected retry', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    renderContent({ errorMessage: 'No se pudo cargar.', onRetry })

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar.')
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('does not render a retry action when onRetry is not supplied', () => {
    renderContent({ errorMessage: 'No se pudo cargar.', onRetry: undefined })

    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
  })

  it('renders the unavailable state when evento is null', () => {
    renderContent({ evento: null })

    expect(screen.getByText('No encontramos el evento solicitado.')).toBeInTheDocument()
  })

  it('renders the unavailable state when readiness is null', () => {
    renderContent({ readiness: null })

    expect(screen.getByText('No encontramos el evento solicitado.')).toBeInTheDocument()
  })

  it('shows a "no rows" message when ready but nothing calculated yet', () => {
    renderContent({ readiness: READINESS_READY, payments: [] })

    expect(
      screen.getByText('Aún no se han calculado pagos para este evento.'),
    ).toBeInTheDocument()
  })

  it('renders the forbidden state, taking priority over loading/error/the payments list, when canView is false', () => {
    renderContent({ canView: false, isLoading: true, errorMessage: 'Error.' })

    expect(
      screen.getByText('No tienes permiso para ver esta sección'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Pagos')).not.toBeInTheDocument()
  })
})
