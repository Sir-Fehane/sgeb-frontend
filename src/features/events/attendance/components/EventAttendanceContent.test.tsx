import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import {
  EventAttendanceContent,
  type EventAttendanceContentProps,
} from '@/features/events/attendance/components/EventAttendanceContent'
import type { EventAttendanceParticipantViewModel } from '@/features/events/attendance/types/attendance'
import type { EventDetailViewModel } from '@/features/events/types/event'

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

const SELECCIONADO: EventAttendanceParticipantViewModel = {
  idParticipacion: 5003,
  nombre: 'Mesero de demostración tres',
  puesto: 'mesero',
  estadoParticipacion: 'seleccionado',
}

const ASISTENCIA_PENDIENTE_LLEGADA: EventAttendanceParticipantViewModel = {
  idParticipacion: 6001,
  nombre: 'Mesero de demostración cinco',
  puesto: 'mesero',
  estadoParticipacion: 'confirmo_asistencia',
}

const LLEGADA_EXITOSA: EventAttendanceParticipantViewModel = {
  idParticipacion: 6002,
  nombre: 'Mesero de demostración seis',
  puesto: 'barra',
  estadoParticipacion: 'confirmo_llegada',
  ultimaConfirmacionLlegada: {
    metodo: 'face_id',
    biometricoVerificado: true,
    dispositivoVinculado: true,
    distanciaM: 12.4,
    precisionM: 8,
    dentroGeocerca: true,
    resultado: 'exitoso',
    timestamp: '2026-09-12T17:53:00Z',
  },
}

const FUERA_GEOCERCA: EventAttendanceParticipantViewModel = {
  idParticipacion: 6003,
  nombre: 'Mesero de demostración siete',
  puesto: 'mesero',
  estadoParticipacion: 'confirmo_asistencia',
  ultimaConfirmacionLlegada: {
    metodo: 'face_id',
    biometricoVerificado: true,
    dispositivoVinculado: true,
    distanciaM: 245.8,
    precisionM: 10,
    dentroGeocerca: false,
    resultado: 'fallido',
    motivoFallo: 'fuera_geocerca',
    timestamp: '2026-09-12T17:40:00Z',
  },
}

const BIOMETRIA_FALLIDA: EventAttendanceParticipantViewModel = {
  idParticipacion: 6004,
  nombre: 'Mesero de demostración ocho',
  puesto: 'barra',
  estadoParticipacion: 'confirmo_asistencia',
  ultimaConfirmacionLlegada: {
    metodo: 'ninguno',
    biometricoVerificado: false,
    dispositivoVinculado: true,
    distanciaM: 5.1,
    precisionM: 6,
    dentroGeocerca: true,
    resultado: 'fallido',
    motivoFallo: 'biometria_fallida',
    timestamp: '2026-09-12T17:47:00Z',
  },
}

const DISPOSITIVO_NO_VINCULADO: EventAttendanceParticipantViewModel = {
  idParticipacion: 6005,
  nombre: 'Mesero de demostración nueve',
  puesto: 'mesero',
  estadoParticipacion: 'confirmo_asistencia',
  ultimaConfirmacionLlegada: {
    metodo: 'face_id',
    biometricoVerificado: true,
    dispositivoVinculado: false,
    distanciaM: 9.7,
    precisionM: 7,
    dentroGeocerca: true,
    resultado: 'fallido',
    motivoFallo: 'dispositivo_no_vinculado',
    timestamp: '2026-09-12T17:50:00Z',
  },
}

const DISPOSITIVO_DE_OTRO_USUARIO: EventAttendanceParticipantViewModel = {
  idParticipacion: 6006,
  nombre: 'Mesero de demostración diez',
  puesto: 'mesero',
  estadoParticipacion: 'confirmo_asistencia',
  ultimaConfirmacionLlegada: {
    metodo: 'huella',
    biometricoVerificado: true,
    dispositivoVinculado: false,
    distanciaM: 4.2,
    precisionM: 5,
    dentroGeocerca: true,
    resultado: 'fallido',
    motivoFallo: 'dispositivo_de_otro_usuario',
    timestamp: '2026-09-12T17:55:00Z',
  },
}

const PRECISION_INSUFICIENTE: EventAttendanceParticipantViewModel = {
  idParticipacion: 6007,
  nombre: 'Mesero de demostración once',
  puesto: 'barra',
  estadoParticipacion: 'confirmo_asistencia',
  ultimaConfirmacionLlegada: {
    metodo: 'huella',
    biometricoVerificado: true,
    dispositivoVinculado: true,
    distanciaM: 45,
    precisionM: 200,
    dentroGeocerca: false,
    resultado: 'fallido',
    motivoFallo: 'precision_insuficiente',
    timestamp: '2026-09-12T17:58:00Z',
  },
}

const ALL_PARTICIPANTS = [
  SELECCIONADO,
  ASISTENCIA_PENDIENTE_LLEGADA,
  LLEGADA_EXITOSA,
  FUERA_GEOCERCA,
  BIOMETRIA_FALLIDA,
  DISPOSITIVO_NO_VINCULADO,
  DISPOSITIVO_DE_OTRO_USUARIO,
  PRECISION_INSUFICIENTE,
]

function renderContent(props: Partial<EventAttendanceContentProps> = {}) {
  return render(
    <MemoryRouter>
      <EventAttendanceContent
        evento={EVENTO}
        participants={ALL_PARTICIPANTS}
        {...props}
      />
    </MemoryRouter>,
  )
}

describe('EventAttendanceContent — header', () => {
  it('renders exactly one h2 "Pase de lista" and states arrival happens on the mesero device', () => {
    renderContent()

    expect(
      screen.getAllByRole('heading', { level: 2, name: 'Pase de lista' }),
    ).toHaveLength(1)
    expect(screen.getByText(/dispositivo de cada mesero/)).toBeInTheDocument()
  })

  it('provides a real link back to /eventos/{id}', () => {
    renderContent()

    expect(screen.getByRole('link', { name: /Volver al evento/ })).toHaveAttribute(
      'href',
      '/eventos/1001',
    )
  })
})

describe('EventAttendanceContent — participant states', () => {
  it('renders a seleccionado (pending) participant with its own text status', () => {
    renderContent()

    expect(screen.getByText(SELECCIONADO.nombre)).toBeInTheDocument()
    expect(screen.getAllByText('Seleccionado').length).toBeGreaterThan(0)
  })

  it('renders a confirmo_asistencia participant with "Llegada pendiente" when no attempt exists', () => {
    renderContent()

    const row = screen.getByText(ASISTENCIA_PENDIENTE_LLEGADA.nombre).closest('li')
    expect(row).not.toBeNull()
    expect(row).toHaveTextContent('Asistencia confirmada')
    expect(row).toHaveTextContent('Llegada pendiente')
  })

  it('renders a confirmo_llegada participant as "Llegada confirmada"', () => {
    renderContent()

    const row = screen.getByText(LLEGADA_EXITOSA.nombre).closest('li')
    expect(row).toHaveTextContent('Llegada confirmada')
  })

  it('every status is visible as text, not just conveyed by color', () => {
    renderContent()

    // Sampling: every participant name is accompanied by readable status text.
    for (const participant of ALL_PARTICIPANTS) {
      const row = screen.getByText(participant.nombre).closest('li')
      expect(row?.textContent?.length).toBeGreaterThan(participant.nombre.length)
    }
  })
})

describe('EventAttendanceContent — successful arrival', () => {
  it('shows "Llegada confirmada" with a formatted time, safely, no technical identifiers', () => {
    renderContent()

    const row = screen.getByText(LLEGADA_EXITOSA.nombre).closest('li')
    expect(row).toHaveTextContent('Llegada confirmada')

    const timeEl = row?.querySelector('time')
    expect(timeEl).not.toBeNull()
    expect(timeEl).toHaveAttribute(
      'dateTime',
      LLEGADA_EXITOSA.ultimaConfirmacionLlegada?.timestamp,
    )
  })

  it('never renders uuid_dispositivo or id_confirmacion anywhere', () => {
    renderContent()

    const uuidPattern =
      /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i
    const rendered = document.body.textContent ?? ''
    expect(rendered).not.toMatch(uuidPattern)
    expect(rendered).not.toMatch(/id_confirmacion/i)
  })
})

describe('EventAttendanceContent — live-shaped arrival (fechaLlegada, no ultimaConfirmacionLlegada)', () => {
  it('shows "Llegada confirmada" with a formatted time sourced from fechaLlegada alone — the live mapper never populates ultimaConfirmacionLlegada', () => {
    const LLEGADA_VIVA: EventAttendanceParticipantViewModel = {
      idParticipacion: 9001,
      nombre: 'Mesero en vivo',
      puesto: 'mesero',
      estadoParticipacion: 'confirmo_llegada',
      fechaLlegada: '2026-09-12T18:10:00Z',
    }

    renderContent({ participants: [LLEGADA_VIVA] })

    const row = screen.getByText(LLEGADA_VIVA.nombre).closest('li')
    expect(row).toHaveTextContent('Llegada confirmada')
    const timeEl = row?.querySelector('time')
    expect(timeEl).not.toBeNull()
    expect(timeEl).toHaveAttribute('dateTime', '2026-09-12T18:10:00Z')
  })

  it('a downstream state bucketed as confirmo_llegada (asignado/vinculo/salida) with no fechaLlegada still renders "Llegada confirmada" without a time, never crashing or showing "undefined"', () => {
    const SIN_FECHA: EventAttendanceParticipantViewModel = {
      idParticipacion: 9002,
      nombre: 'Mesero sin fecha',
      puesto: 'mesero',
      estadoParticipacion: 'confirmo_llegada',
    }

    expect(() => renderContent({ participants: [SIN_FECHA] })).not.toThrow()

    const row = screen.getByText(SIN_FECHA.nombre).closest('li')
    expect(row).toHaveTextContent('Llegada confirmada')
    expect(row?.querySelector('time')).toBeNull()
    expect(row?.textContent?.toLowerCase()).not.toContain('undefined')
  })
})

describe('EventAttendanceContent — failed/inconclusive arrival reasons', () => {
  it('fuera_geocerca renders a safe explicit label', () => {
    renderContent()
    const row = screen.getByText(FUERA_GEOCERCA.nombre).closest('li')
    expect(row).toHaveTextContent('Fuera de la geocerca del evento')
    expect(row).toHaveTextContent('Requiere revisión')
  })

  it('biometria_fallida renders a safe explicit label', () => {
    renderContent()
    const row = screen.getByText(BIOMETRIA_FALLIDA.nombre).closest('li')
    expect(row).toHaveTextContent('Verificación biométrica fallida')
    expect(row).toHaveTextContent('Requiere revisión')
  })

  it('dispositivo_no_vinculado renders a safe explicit label', () => {
    renderContent()
    const row = screen.getByText(DISPOSITIVO_NO_VINCULADO.nombre).closest('li')
    expect(row).toHaveTextContent('Dispositivo no vinculado a este usuario')
  })

  it('dispositivo_de_otro_usuario gets explicit attention treatment', () => {
    renderContent()
    const row = screen.getByText(DISPOSITIVO_DE_OTRO_USUARIO.nombre).closest('li')
    expect(row).toHaveTextContent('Dispositivo registrado a nombre de otro mesero')
    expect(row).toHaveTextContent('Requiere revisión')
  })

  it('precision_insuficiente is never labeled as absent, and is not flagged "Requiere revisión"', () => {
    renderContent()
    const row = screen.getByText(PRECISION_INSUFICIENTE.nombre).closest('li')
    expect(row).toHaveTextContent('Medición de ubicación inconclusa')
    expect(row).not.toHaveTextContent('Requiere revisión')
    expect(row?.textContent?.toLowerCase()).not.toContain('ausente')
    expect(row?.textContent?.toLowerCase()).not.toContain('falta')
  })

  it('never leaks a raw SGEB error code or enum value to the user', () => {
    renderContent()

    const rendered = document.body.textContent ?? ''
    expect(rendered).not.toMatch(/SGEB-\d{4}/)
    expect(rendered).not.toContain('dispositivo_de_otro_usuario')
    expect(rendered).not.toContain('fuera_geocerca')
  })

  it('falls back to a restrained generic message when motivoFallo is null — never crashes, never renders "undefined", never invents an SGEB code', () => {
    const SIN_MOTIVO: EventAttendanceParticipantViewModel = {
      idParticipacion: 6008,
      nombre: 'Mesero de demostración doce',
      puesto: 'mesero',
      estadoParticipacion: 'confirmo_asistencia',
      ultimaConfirmacionLlegada: {
        metodo: 'ninguno',
        biometricoVerificado: false,
        dispositivoVinculado: true,
        distanciaM: 30,
        precisionM: null,
        dentroGeocerca: true,
        resultado: 'fallido',
        motivoFallo: null,
        timestamp: '2026-09-12T18:02:00Z',
      },
    }

    expect(() =>
      renderContent({ participants: [...ALL_PARTICIPANTS, SIN_MOTIVO] }),
    ).not.toThrow()

    const row = screen.getByText(SIN_MOTIVO.nombre).closest('li')
    expect(row).toHaveTextContent('Llegada no validada')
    expect(row?.textContent?.toLowerCase()).not.toContain('undefined')
    expect(row?.textContent).not.toMatch(/SGEB-\d{4}/)
    expect(row?.textContent?.toLowerCase()).not.toContain('ausente')
  })
})

describe('EventAttendanceContent — summary', () => {
  it('computes correct totals purely from the participant list', () => {
    renderContent()

    // 8 total, 7 with asistencia confirmed or beyond (all but SELECCIONADO),
    // 1 with llegada confirmed, 4 requiring attention — the 5 failed
    // attempts minus PRECISION_INSUFICIENTE, whose presentation explicitly
    // marks requiresReview: false (see the dedicated test below).
    const summarySection = screen.getByText('Resumen').closest('section')
    expect(summarySection).toHaveTextContent('8') // seleccionados total
    expect(summarySection).toHaveTextContent('7') // asistencia confirmada
    expect(summarySection).toHaveTextContent('1') // llegada confirmada
    expect(summarySection).toHaveTextContent('4') // requieren atención
  })

  it('"Requieren atención" counts exactly the motives whose presentation has requiresReview === true — reusing MOTIVO_FALLO_PRESENTATION as the single source of truth', () => {
    const base = {
      puesto: 'mesero' as const,
      estadoParticipacion: 'confirmo_asistencia' as const,
    }
    const arrivalBase = {
      biometricoVerificado: true,
      dispositivoVinculado: true,
      distanciaM: 10,
      precisionM: 8,
      dentroGeocerca: true,
      resultado: 'fallido' as const,
      timestamp: '2026-09-12T18:00:00Z',
    }

    const collusion: EventAttendanceParticipantViewModel = {
      ...base,
      idParticipacion: 101,
      nombre: 'Requiere atención uno',
      ultimaConfirmacionLlegada: {
        ...arrivalBase,
        metodo: 'huella',
        motivoFallo: 'dispositivo_de_otro_usuario',
      },
    }
    const inconclusive: EventAttendanceParticipantViewModel = {
      ...base,
      idParticipacion: 102,
      nombre: 'No requiere atención uno',
      ultimaConfirmacionLlegada: {
        ...arrivalBase,
        metodo: 'huella',
        motivoFallo: 'precision_insuficiente',
      },
    }
    const noReason: EventAttendanceParticipantViewModel = {
      ...base,
      idParticipacion: 103,
      nombre: 'No requiere atención dos',
      ultimaConfirmacionLlegada: {
        ...arrivalBase,
        metodo: 'ninguno',
        motivoFallo: null,
      },
    }

    renderContent({ participants: [collusion, inconclusive, noReason] })

    const summary = within(screen.getByText('Resumen').closest('section')!)
    expect(
      summary.getByText('Requieren atención').closest('div')?.querySelector('dd'),
    ).toHaveTextContent('1')
  })

  it('uses cumulative funnel semantics — a participant who reached confirmo_llegada is never dropped from the asistencia-confirmada total', () => {
    const seleccionado: EventAttendanceParticipantViewModel = {
      idParticipacion: 1,
      nombre: 'Participante A',
      puesto: 'mesero',
      estadoParticipacion: 'seleccionado',
    }
    const asistenciaConfirmada: EventAttendanceParticipantViewModel = {
      idParticipacion: 2,
      nombre: 'Participante B',
      puesto: 'mesero',
      estadoParticipacion: 'confirmo_asistencia',
    }
    const llegadaConfirmada: EventAttendanceParticipantViewModel = {
      idParticipacion: 3,
      nombre: 'Participante C',
      puesto: 'mesero',
      estadoParticipacion: 'confirmo_llegada',
      ultimaConfirmacionLlegada: {
        metodo: 'face_id',
        biometricoVerificado: true,
        dispositivoVinculado: true,
        distanciaM: 3,
        precisionM: 5,
        dentroGeocerca: true,
        resultado: 'exitoso',
        timestamp: '2026-09-12T17:00:00Z',
      },
    }

    renderContent({
      participants: [seleccionado, asistenciaConfirmada, llegadaConfirmada],
    })

    const summary = within(screen.getByText('Resumen').closest('section')!)

    // "Seleccionados" is the total roster (3), not an exact-state count of
    // only those still at `seleccionado` — B and C were selected too.
    expect(
      summary.getByText('Seleccionados').closest('div')?.querySelector('dd'),
    ).toHaveTextContent('3')
    // "Asistencia confirmada" counts everyone who reached that stage OR
    // beyond: B (confirmo_asistencia) AND C (confirmo_llegada) = 2. C must
    // never be presented as if they had not confirmed attendance.
    expect(
      summary.getByText('Asistencia confirmada').closest('div')?.querySelector('dd'),
    ).toHaveTextContent('2')
    // "Llegada confirmada" is the final stage — only C = 1.
    expect(
      summary.getByText('Llegada confirmada').closest('div')?.querySelector('dd'),
    ).toHaveTextContent('1')
  })
})

describe('EventAttendanceContent — empty / loading / error / unavailable', () => {
  it('renders "no selected participants" text when the list is empty', () => {
    renderContent({ participants: [] })

    expect(
      screen.getByText('Aún no hay meseros seleccionados para este evento.'),
    ).toBeInTheDocument()
  })

  it('renders exactly the loading state when isLoading is true', () => {
    renderContent({ isLoading: true })

    expect(
      screen.getByRole('status', { name: 'Cargando pase de lista' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(SELECCIONADO.nombre)).not.toBeInTheDocument()
  })

  it('renders the error state with an injected retry', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    renderContent({ errorMessage: 'Ocurrió un problema inesperado.', onRetry })

    expect(screen.getByRole('alert')).toHaveTextContent('Ocurrió un problema inesperado.')
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
  })
})

describe('EventAttendanceContent — read-only boundary', () => {
  it('never renders any mutation action or ownership violation', () => {
    renderContent()

    for (const forbidden of [
      'Confirmar llegada',
      'Marcar asistencia',
      'Confirmar manualmente',
      'Aprobar llegada',
      'Usar Face ID',
      'Usar huella',
      'Tomar ubicación',
      'Deseleccionar',
    ]) {
      expect(screen.queryByRole('button', { name: forbidden })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: forbidden })).not.toBeInTheDocument()
    }

    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('displaying "Face ID"/"Huella" as text is allowed — it is never a clickable action', () => {
    renderContent()

    const faceIdMatches = screen.getAllByText(/Face ID/)
    expect(faceIdMatches.length).toBeGreaterThan(0)
    for (const match of faceIdMatches) {
      expect(match.closest('button')).toBeNull()
      expect(match.closest('a')).toBeNull()
    }
  })
})
