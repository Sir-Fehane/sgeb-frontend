import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fetchAttendanceParticipants,
  mapParticipacionToAttendanceViewModel,
  type ParticipacionApiRecord,
} from '@/features/events/attendance/services/attendanceApi'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

function record(overrides: Partial<ParticipacionApiRecord> = {}): ParticipacionApiRecord {
  return {
    id_participacion: 5003,
    puesto: 'mesero',
    estado: 'seleccionado',
    fecha_llegada: null,
    usuario: {
      uuid_usuario: 'aa2a9c14-0000-4000-8000-000000000003',
      nombre: 'Juan',
      apellido_paterno: 'Pérez',
      apellido_materno: null,
      correo: 'juan@example.mx',
      telefono: null,
    },
    ...overrides,
  }
}

describe('mapParticipacionToAttendanceViewModel', () => {
  it('returns null for estado "aparto" — not yet selected, out of this roster', () => {
    expect(mapParticipacionToAttendanceViewModel(record({ estado: 'aparto' }))).toBeNull()
  })

  it('maps "seleccionado" and "confirmo_asistencia" straight through, without fechaLlegada', () => {
    expect(
      mapParticipacionToAttendanceViewModel(record({ estado: 'seleccionado' })),
    ).toEqual({
      idParticipacion: 5003,
      nombre: 'Juan Pérez',
      puesto: 'mesero',
      estadoParticipacion: 'seleccionado',
    })
    expect(
      mapParticipacionToAttendanceViewModel(record({ estado: 'confirmo_asistencia' })),
    ).toEqual({
      idParticipacion: 5003,
      nombre: 'Juan Pérez',
      puesto: 'mesero',
      estadoParticipacion: 'confirmo_asistencia',
    })
  })

  it.each(['confirmo_llegada', 'asignado', 'vinculo', 'salida'] as const)(
    'buckets downstream state "%s" as confirmo_llegada, carrying fecha_llegada as fechaLlegada',
    (estado) => {
      const mapped = mapParticipacionToAttendanceViewModel(
        record({ estado, fecha_llegada: '2026-09-12T17:53:00Z' }),
      )
      expect(mapped).toEqual({
        idParticipacion: 5003,
        nombre: 'Juan Pérez',
        puesto: 'mesero',
        estadoParticipacion: 'confirmo_llegada',
        fechaLlegada: '2026-09-12T17:53:00Z',
      })
    },
  )

  it('never populates ultimaConfirmacionLlegada — no backend source exists for arrival-attempt detail', () => {
    const mapped = mapParticipacionToAttendanceViewModel(
      record({ estado: 'confirmo_llegada', fecha_llegada: '2026-09-12T17:53:00Z' }),
    )
    expect(mapped).not.toHaveProperty('ultimaConfirmacionLlegada')
  })

  it('omits fechaLlegada when confirmo_llegada arrives with a null fecha_llegada (defensive, never observed against the pinned backend)', () => {
    const mapped = mapParticipacionToAttendanceViewModel(
      record({ estado: 'confirmo_llegada', fecha_llegada: null }),
    )
    expect(mapped).not.toHaveProperty('fechaLlegada')
  })

  it('composes nombre with apellido_materno when present, and never exposes correo/telefono/uuid_usuario/checklist_ok', () => {
    const mapped = mapParticipacionToAttendanceViewModel(
      record({
        usuario: {
          uuid_usuario: 'aa2a9c14-0000-4000-8000-000000000009',
          nombre: 'Ana',
          apellido_paterno: 'García',
          apellido_materno: 'López',
          correo: 'ana@example.mx',
          telefono: '5512345678',
        },
      }),
    )
    expect(mapped?.nombre).toBe('Ana García López')
    expect(mapped).not.toHaveProperty('uuidUsuario')
    expect(mapped).not.toHaveProperty('correo')
    expect(mapped).not.toHaveProperty('telefono')
    expect(mapped).not.toHaveProperty('checklistOk')
  })
})

describe('fetchAttendanceParticipants', () => {
  it('requests GET /eventos/{id}/participaciones with the signal, mapping and filtering out aparto rows', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: [
        record({ id_participacion: 1, estado: 'aparto' }),
        record({ id_participacion: 2, estado: 'seleccionado' }),
        record({
          id_participacion: 3,
          estado: 'confirmo_llegada',
          fecha_llegada: '2026-09-12T17:53:00Z',
        }),
      ],
    })
    const controller = new AbortController()

    const result = await fetchAttendanceParticipants(1001, controller.signal)

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/eventos/1001/participaciones',
      signal: controller.signal,
    })
    expect(result).toHaveLength(2)
    expect(result.map((p) => p.idParticipacion)).toEqual([2, 3])
  })

  it('resolves to an empty array on SGEB-0002 (empty roster), not an error', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0002', message: 'Sin resultados.' },
      data: [],
    })

    const result = await fetchAttendanceParticipants(1001)

    expect(result).toEqual([])
  })
})
