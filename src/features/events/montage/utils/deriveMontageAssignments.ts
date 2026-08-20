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
 * Resolves "who currently has which table" from `Participacion.estado`
 * crossed with matching `AsignacionMesa` rows — see `types/montage.ts`'s
 * module comment for why raw row history alone cannot answer this
 * (`AsignacionMesa` rows are never deleted, and releasing one never
 * reverts `Participacion.estado`).
 *
 * - `estado === 'asignado'` → the newest `vinculada: false` row for that
 *   participation is their current (pending) table.
 * - `estado === 'vinculo'` → the newest `vinculada: true` row is their
 *   current (linked) table. If none exists — the confirmed
 *   release-doesn't-revert-estado gap — this participant is treated as
 *   having no current table: mesa-side truth wins over the stale
 *   participation state.
 * - Any other `estado` → no current table, regardless of old rows.
 *
 * Residual, reported (not silently patched) limitation: this only
 * self-heals the `'vinculo'`-without-a-`vinculada:true`-row case. A table
 * assigned and then released *before* ever being linked leaves the
 * participation at `estado: 'asignado'` with its one `vinculada: false`
 * row untouched by `liberarMesa` — nothing in the API distinguishes that
 * row from a still-pending one, so it keeps showing as "pending" until a
 * later real change (e.g. a fresh assignment, which wins on
 * `fechaAsignacion`) supersedes it. Fixing this needs a backend-side
 * signal (e.g. an `activa` flag on `asignacion_mesa`, or having
 * `liberarMesa` also revert `Participacion.estado`) — see this branch's
 * report.
 */
export function deriveMontageAssignments(
  participants: readonly MontageRosterParticipant[],
  mesas: readonly MesaViewModel[],
  assignments: readonly AsignacionMesaViewModel[],
): DerivedMontageAssignments {
  const currentAssignmentByParticipation = new Map<number, MontageAssignmentViewModel>()

  for (const participant of participants) {
    const wantsVinculada = participant.estado === 'vinculo'
    if (!wantsVinculada && participant.estado !== 'asignado') {
      continue
    }

    const candidates = assignments.filter(
      (assignment) =>
        assignment.idParticipacion === participant.idParticipacion &&
        assignment.vinculada === wantsVinculada,
    )
    if (candidates.length === 0) {
      continue
    }

    const latest = wantsVinculada
      ? pickLatest(candidates, (a) => a.fechaVinculacion ?? a.fechaAsignacion)
      : pickLatest(candidates, (a) => a.fechaAsignacion)

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
