import { findAttendanceParticipants } from '@/features/events/attendance/fixtures/attendanceFixtures'
import type {
  EventTableViewModel,
  MontageParticipantViewModel,
} from '@/features/events/montage/types/montage'

/**
 * Development/demo fixtures only — NOT live backend data. Deliberately
 * builds on Attendance's real roster (`findAttendanceParticipants`, itself
 * built on Team Selection's roster) rather than duplicating a third,
 * unrelated one — `findAttendanceParticipants` is read, never mutated,
 * and neither Team Selection's nor Attendance's own fixtures/tests import
 * anything from here.
 *
 * For event 1001, three participants are reused as-is by id/nombre/puesto
 * (5003, 6001, 6002 — the same people visible on Attendance) with
 * montage-specific state layered on top; two new fictional participants
 * (`7001`/`7002`, a clearly different id range) are added because the
 * existing roster cannot demonstrate every required case — specifically,
 * an approved-and-eligible-for-assignment state and an already-assigned
 * state. `7002` is deliberately `puesto: 'barra'`, to demonstrate that
 * this foundation does not invent a puesto-based eligibility block (see
 * the README's contract-gap note).
 */
const MONTAGE_PARTICIPANTS: Readonly<
  Record<number, readonly MontageParticipantViewModel[]>
> = {
  1001: [
    // Case: no checklist instance created yet.
    {
      idParticipacion: 5003,
      nombre: 'Mesero de demostración tres',
      puesto: 'mesero',
      assignedTables: [],
    },
    // Case: checklist pending (some items still incomplete).
    {
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
            cantidad: 8,
            hecho: true,
          },
          {
            idItem: 3,
            descripcion: 'Verificar cubiertos',
            cantidadEsperada: 8,
            cantidad: 5,
            hecho: false,
          },
          {
            idItem: 4,
            descripcion: 'Confirmar centro de mesa',
            cantidadEsperada: 1,
            cantidad: 0,
            hecho: false,
          },
        ],
      },
      assignedTables: [],
    },
    // Case: checklist completed but not yet approved by the captain.
    {
      idParticipacion: 6002,
      nombre: 'Mesero de demostración seis',
      puesto: 'barra',
      checklist: {
        idChecklistInstancia: 9002,
        nombre: 'Montaje de estación',
        status: 'completed',
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
            cantidad: 8,
            hecho: true,
          },
          {
            idItem: 3,
            descripcion: 'Verificar cubiertos',
            cantidadEsperada: 8,
            cantidad: 8,
            hecho: true,
          },
          {
            idItem: 4,
            descripcion: 'Confirmar centro de mesa',
            cantidadEsperada: 1,
            cantidad: 1,
            hecho: true,
          },
        ],
      },
      assignedTables: [],
    },
    // Case: checklist approved, eligible for assignment, no table yet.
    {
      idParticipacion: 7001,
      nombre: 'Mesero de demostración doce',
      puesto: 'mesero',
      checklist: {
        idChecklistInstancia: 9003,
        nombre: 'Montaje de estación',
        status: 'approved',
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
            cantidad: 8,
            hecho: true,
          },
          {
            idItem: 3,
            descripcion: 'Verificar cubiertos',
            cantidadEsperada: 8,
            cantidad: 8,
            hecho: true,
          },
          {
            idItem: 4,
            descripcion: 'Confirmar centro de mesa',
            cantidadEsperada: 1,
            cantidad: 1,
            hecho: true,
          },
        ],
      },
      assignedTables: [],
    },
    // Case: checklist approved AND already has an assigned table.
    {
      idParticipacion: 7002,
      nombre: 'Mesero de demostración trece',
      puesto: 'barra',
      checklist: {
        idChecklistInstancia: 9004,
        nombre: 'Montaje de estación',
        status: 'approved',
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
            cantidad: 8,
            hecho: true,
          },
          {
            idItem: 3,
            descripcion: 'Verificar cubiertos',
            cantidadEsperada: 8,
            cantidad: 8,
            hecho: true,
          },
          {
            idItem: 4,
            descripcion: 'Confirmar centro de mesa',
            cantidadEsperada: 1,
            cantidad: 1,
            hecho: true,
          },
        ],
      },
      assignedTables: [
        {
          idAsignacion: 1,
          mesa: { idMesa: 3, etiqueta: 'Mesa 3 VIP', estado: 'ocupada' },
        },
      ],
    },
  ],
}

/** Event 1001's table roster — two free, one occupied (assigned to participation 7002 above). */
const MONTAGE_TABLES: Readonly<Record<number, readonly EventTableViewModel[]>> = {
  1001: [
    { idMesa: 1, etiqueta: 'Mesa 1', estado: 'libre' },
    { idMesa: 2, etiqueta: 'Mesa 2', estado: 'libre' },
    { idMesa: 3, etiqueta: 'Mesa 3 VIP', estado: 'ocupada' },
  ],
}

/**
 * Returns the montage roster for an event. An event with a specific
 * overlay (currently only 1001) uses it as-is; any other event id falls
 * back to Attendance's real roster with no checklist/assignment state yet
 * (correctly demonstrating "no checklist data" without a fixture of its
 * own). An event with no selected participants at all (e.g. 2001, where
 * Team Selection has zero `seleccionado` rows) correctly returns an empty
 * list — the "no participants" state.
 */
export function findMontageParticipants(
  idEvento: number,
): readonly MontageParticipantViewModel[] {
  const overlay = MONTAGE_PARTICIPANTS[idEvento]
  if (overlay) {
    return overlay
  }

  return findAttendanceParticipants(idEvento).map((participant) => ({
    idParticipacion: participant.idParticipacion,
    nombre: participant.nombre,
    puesto: participant.puesto,
    assignedTables: [],
  }))
}

/**
 * Returns the event's table roster. Any event without a specific overlay
 * (currently only 1001 has one) correctly returns an empty list — the "no
 * tables" state.
 */
export function findMontageTables(idEvento: number): readonly EventTableViewModel[] {
  return MONTAGE_TABLES[idEvento] ?? []
}
