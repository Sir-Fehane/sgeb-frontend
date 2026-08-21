import { describe, expect, it } from 'vitest'

import { deriveMontageAssignments } from '@/features/events/montage/utils/deriveMontageAssignments'
import type { AsignacionMesaViewModel } from '@/features/events/services/asignacionesApi'
import type { MesaViewModel } from '@/features/events/services/mesasApi'
import type { MontageRosterParticipant } from '@/features/events/montage/types/montage'

function mesa(overrides: Partial<MesaViewModel> & { idMesa: number }): MesaViewModel {
  return {
    etiqueta: `Mesa ${String(overrides.idMesa)}`,
    estado: 'libre',
    codigoQr: '11111111-1111-4111-8111-111111111111',
    ...overrides,
  }
}

function participant(
  overrides: Partial<MontageRosterParticipant> & { idParticipacion: number },
): MontageRosterParticipant {
  return {
    nombre: `Mesero ${String(overrides.idParticipacion)}`,
    puesto: 'mesero',
    estado: 'confirmo_llegada',
    checklistOk: true,
    ...overrides,
  }
}

function assignment(
  overrides: Partial<AsignacionMesaViewModel> & {
    idAsignacion: number
    idParticipacion: number
    idMesa: number
    vinculada: boolean
  },
): AsignacionMesaViewModel {
  return {
    fechaAsignacion: '2026-08-19T10:00:00.000Z',
    fechaVinculacion: null,
    activa: true,
    fechaLiberacion: null,
    mesa: {
      idMesa: overrides.idMesa,
      etiqueta: `Mesa ${String(overrides.idMesa)}`,
      estado: 'libre',
    },
    participacion: {
      idParticipacion: overrides.idParticipacion,
      puesto: 'mesero',
      estado: 'asignado',
      checklistOk: true,
      usuario: {
        uuidUsuario: 'usuario-uuid',
        nombre: 'Mesero',
        apellidoPaterno: 'Apellido',
        apellidoMaterno: null,
      },
    },
    ...overrides,
  }
}

describe('deriveMontageAssignments', () => {
  it('resolves a pending (unlinked) assignment for a participant at estado "asignado"', () => {
    const participants = [participant({ idParticipacion: 1, estado: 'asignado' })]
    const mesas = [mesa({ idMesa: 10 })]
    const assignments = [
      assignment({ idAsignacion: 100, idParticipacion: 1, idMesa: 10, vinculada: false }),
    ]

    const result = deriveMontageAssignments(participants, mesas, assignments)

    expect(result.currentAssignmentByParticipation.get(1)).toEqual({
      idAsignacion: 100,
      idParticipacion: 1,
      idMesa: 10,
      nombreMesero: 'Mesero 1',
      etiquetaMesa: 'Mesa 10',
      vinculada: false,
    })
    expect(result.tables[0]?.currentAssignment).toEqual(
      result.currentAssignmentByParticipation.get(1),
    )
  })

  it('resolves a linked assignment for a participant at estado "vinculo"', () => {
    const participants = [participant({ idParticipacion: 2, estado: 'vinculo' })]
    const mesas = [mesa({ idMesa: 20, estado: 'ocupada' })]
    const assignments = [
      assignment({
        idAsignacion: 200,
        idParticipacion: 2,
        idMesa: 20,
        vinculada: true,
        fechaVinculacion: '2026-08-19T10:05:00.000Z',
      }),
    ]

    const result = deriveMontageAssignments(participants, mesas, assignments)

    expect(result.currentAssignmentByParticipation.get(2)?.vinculada).toBe(true)
    expect(result.currentAssignmentByParticipation.get(2)?.idMesa).toBe(20)
  })

  it('ignores a released (activa:false) row entirely — regression: a released mesero must never again show "con mesa asignada"', () => {
    const participants = [participant({ idParticipacion: 3, estado: 'confirmo_llegada' })]
    const mesas = [mesa({ idMesa: 30 })]
    const assignments = [
      assignment({
        idAsignacion: 300,
        idParticipacion: 3,
        idMesa: 30,
        vinculada: false,
        activa: false,
        fechaLiberacion: '2026-08-19T10:30:00.000Z',
      }),
    ]

    const result = deriveMontageAssignments(participants, mesas, assignments)

    expect(result.currentAssignmentByParticipation.has(3)).toBe(false)
    expect(result.tables[0]?.currentAssignment).toBeUndefined()
  })

  it('resolves the still-active row over an older released one for the same participant — the pre-v1.13 ambiguity `activa` now resolves', () => {
    // Before v1.13, a released-before-linked row and a genuinely pending
    // one were both bare `vinculada: false` rows, indistinguishable. The
    // explicit `activa` field removes that ambiguity: the released row is
    // simply excluded as a candidate.
    const participants = [participant({ idParticipacion: 7, estado: 'asignado' })]
    const mesas = [mesa({ idMesa: 70 }), mesa({ idMesa: 71 })]
    const assignments = [
      assignment({
        idAsignacion: 699,
        idParticipacion: 7,
        idMesa: 70,
        vinculada: false,
        activa: false,
        fechaAsignacion: '2026-08-19T08:00:00.000Z',
        fechaLiberacion: '2026-08-19T08:30:00.000Z',
      }),
      assignment({
        idAsignacion: 700,
        idParticipacion: 7,
        idMesa: 71,
        vinculada: false,
        fechaAsignacion: '2026-08-19T09:00:00.000Z',
      }),
    ]

    const result = deriveMontageAssignments(participants, mesas, assignments)

    expect(result.currentAssignmentByParticipation.get(7)?.idAsignacion).toBe(700)
    expect(result.currentAssignmentByParticipation.get(7)?.idMesa).toBe(71)
  })

  it('picks the newest matching row when a participant holds more than one simultaneous active assignment (the backend does not prevent this)', () => {
    const participants = [participant({ idParticipacion: 4, estado: 'asignado' })]
    const mesas = [mesa({ idMesa: 40 }), mesa({ idMesa: 41 })]
    const assignments = [
      assignment({
        idAsignacion: 400,
        idParticipacion: 4,
        idMesa: 40,
        vinculada: false,
        fechaAsignacion: '2026-08-19T09:00:00.000Z',
      }),
      assignment({
        idAsignacion: 401,
        idParticipacion: 4,
        idMesa: 41,
        vinculada: false,
        fechaAsignacion: '2026-08-19T11:00:00.000Z',
      }),
    ]

    const result = deriveMontageAssignments(participants, mesas, assignments)

    expect(result.currentAssignmentByParticipation.get(4)?.idAsignacion).toBe(401)
    expect(result.currentAssignmentByParticipation.get(4)?.idMesa).toBe(41)
  })

  it('trusts activa over participation estado — a departed ("salida") participant whose table was never released still shows as currently assigned', () => {
    // v1.13 makes `activa` the sole source of truth for "current table."
    // Hiding a genuinely active row because the participant's own estado
    // looks unusual would mask a real operational problem (a table nobody
    // remembered to release) rather than protect against one.
    const participants = [participant({ idParticipacion: 6, estado: 'salida' })]
    const mesas = [mesa({ idMesa: 60, estado: 'ocupada' })]
    const assignments = [
      assignment({ idAsignacion: 600, idParticipacion: 6, idMesa: 60, vinculada: true }),
    ]

    const result = deriveMontageAssignments(participants, mesas, assignments)

    expect(result.currentAssignmentByParticipation.get(6)?.idAsignacion).toBe(600)
  })

  it('leaves currentAssignment absent for a table nobody currently has', () => {
    const result = deriveMontageAssignments([], [mesa({ idMesa: 70 })], [])

    expect(result.tables).toEqual([{ idMesa: 70, etiqueta: 'Mesa 70', estado: 'libre' }])
  })
})
