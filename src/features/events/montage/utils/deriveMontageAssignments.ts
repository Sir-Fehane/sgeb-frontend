import type { AsignacionMesaViewModel } from '@/features/events/services/asignacionesApi'
import type { MesaViewModel } from '@/features/events/services/mesasApi'
import type {
  EventTableViewModel,
  MontageAssignmentViewModel,
  MontageRosterParticipant,
} from '@/features/events/montage/types/montage'

export interface DerivedMontageAssignments {
  tables: EventTableViewModel[]
  /** Keyed by `id_participacion` — absent entries mean "no current table." */
  currentAssignmentByParticipation: ReadonlyMap<number, MontageAssignmentViewModel>
}

function pickLatest(
  candidates: readonly AsignacionMesaViewModel[],
  dateOf: (assignment: AsignacionMesaViewModel) => string,
): AsignacionMesaViewModel {
  return candidates.reduce((latest, candidate) =>
    dateOf(candidate) > dateOf(latest) ? candidate : latest,
  )
}

/**
 * Resolves "who currently has which table" from `AsignacionMesa.activa`
 * alone — v1.13's explicit validity field, confirmed at the
 * model/migration/test level (see `types/montage.ts`'s module comment).
 * `activa=true` is current, linked or not; `activa=false` is
 * released/historical and never surfaces here, regardless of the
 * participant's own `estado` — a departed (`salida`) or otherwise
 * out-of-sequence participant with a genuinely `activa: true` row still
 * shows as currently assigned, since that is real, actionable state for
 * the captain (e.g. a table nobody remembered to release), not something a
 * UI-level heuristic should hide.
 *
 * A participant can hold more than one `activa: true` row at once (the
 * backend does not prevent it); this resolves to the most recently
 * assigned one, same tie-break as before. Modeling multiple simultaneous
 * tables per participant is out of this branch's scope — see the report.
 */
export function deriveMontageAssignments(
  participants: readonly MontageRosterParticipant[],
  mesas: readonly MesaViewModel[],
  assignments: readonly AsignacionMesaViewModel[],
): DerivedMontageAssignments {
  const currentAssignmentByParticipation = new Map<number, MontageAssignmentViewModel>()

  for (const participant of participants) {
    const candidates = assignments.filter(
      (assignment) =>
        assignment.idParticipacion === participant.idParticipacion && assignment.activa,
    )
    if (candidates.length === 0) {
      continue
    }

    const latest = pickLatest(candidates, (a) => a.fechaAsignacion)

    currentAssignmentByParticipation.set(participant.idParticipacion, {
      idAsignacion: latest.idAsignacion,
      idParticipacion: latest.idParticipacion,
      idMesa: latest.idMesa,
      nombreMesero: participant.nombre,
      etiquetaMesa: latest.mesa.etiqueta,
      vinculada: latest.vinculada,
    })
  }

  const currentAssignmentByMesa = new Map<number, MontageAssignmentViewModel>()
  for (const assignment of currentAssignmentByParticipation.values()) {
    currentAssignmentByMesa.set(assignment.idMesa, assignment)
  }

  const tables: EventTableViewModel[] = mesas.map((mesa) => {
    const currentAssignment = currentAssignmentByMesa.get(mesa.idMesa)
    return {
      idMesa: mesa.idMesa,
      etiqueta: mesa.etiqueta,
      estado: mesa.estado,
      ...(currentAssignment ? { currentAssignment } : {}),
    }
  })

  return { tables, currentAssignmentByParticipation }
}
