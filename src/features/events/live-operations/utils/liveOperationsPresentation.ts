import type { Tone } from '@/shared/components'
import type {
  ClosureChecklistStatus,
  ClosureChecklistViewModel,
  LiveOperationsParticipantEstado,
  LiveOperationsParticipantPuesto,
} from '@/features/events/live-operations/types/liveOperations'

/**
 * Presentational label + tone for each `estado` value — a display decision
 * this feature owns (per docs/FrontendArchitecture.md §11: "do that
 * mapping inside the feature that owns the status"), mirroring
 * `attendance/utils/attendancePresentation.ts`'s established pattern.
 * `vinculo` (the one actionable state here) and `salida` (the terminal,
 * completed state) get distinct, meaningful tones; every earlier state is
 * presented identically as `neutral` — this screen doesn't act on them,
 * it just keeps them visible rather than hiding a participant who hasn't
 * reached `vinculo` yet.
 */
export const PARTICIPATION_STATE_LABELS: Record<LiveOperationsParticipantEstado, string> =
  {
    aparto: 'Apartado',
    seleccionado: 'Seleccionado',
    confirmo_asistencia: 'Asistencia confirmada',
    confirmo_llegada: 'Llegada confirmada',
    asignado: 'Asignado a mesa',
    vinculo: 'Vinculado',
    salida: 'Salida registrada',
  }

export const PARTICIPATION_STATE_TONES: Record<LiveOperationsParticipantEstado, Tone> = {
  aparto: 'neutral',
  seleccionado: 'neutral',
  confirmo_asistencia: 'neutral',
  confirmo_llegada: 'neutral',
  asignado: 'neutral',
  vinculo: 'info',
  salida: 'success',
}

export const PUESTO_LABELS: Record<LiveOperationsParticipantPuesto, string> = {
  mesero: 'Mesero',
  barra: 'Barra',
}

/**
 * The state-machine half of "may the captain/admin mark this participant
 * as salida" — matches the pinned backend's `TRANSICIONES` map exactly:
 * `vinculo` is the only state whose sole legal next state is `salida`.
 * This alone is NOT sufficient anymore: the pinned backend authority
 * (`participacion_service.ts`'s `verificarChecklistCierre`) also requires
 * an approved `cierre` checklist — see `isClosureChecklistApprovedForSalida`
 * below, which every real caller (`LiveOperationsParticipantRow`) combines
 * with this one. Kept as its own function rather than folded into a single
 * "canMarkSalida", so `estado`-only eligibility (used to decide whether the
 * row shows an action at all vs. a plain "—" for a non-`vinculo` state) and
 * checklist-readiness (used to decide whether that action is enabled) stay
 * independently testable, matching the two independent backend guards they
 * mirror.
 */
export function isEligibleForSalida(estado: LiveOperationsParticipantEstado): boolean {
  return estado === 'vinculo'
}

/**
 * The checklist half of "may the captain/admin mark this participant as
 * salida" — `true` only when a `cierre` instance exists, is complete, AND
 * is approved (`status === 'approved'`, itself derived from the persisted
 * `aprobado_en`). Deliberately does NOT read `checklist_ok`: that flag is
 * `Participacion`-level and montaje-only (per `ChecklistInstanciaApiRecord`'s
 * own comment) — reusing it here would either silently ignore a real
 * `cierre` approval or, worse, treat an unrelated montaje approval as
 * satisfying the exit requirement. Mirrors the pinned backend's
 * `verificarChecklistCierre` guard exactly (missing / incomplete / complete
 * -but-unapproved all fail identically there).
 */
export function isClosureChecklistApprovedForSalida(
  closureChecklist: ClosureChecklistViewModel | undefined,
): boolean {
  return closureChecklist?.status === 'approved'
}

/**
 * Explains why "Dar salida" is disabled for a `vinculo` participant whose
 * exit checklist isn't ready — `undefined` when it is (the button should be
 * enabled), matching `isClosureChecklistApprovedForSalida`'s condition
 * exactly. Callers only need this when `isEligibleForSalida(estado)` is
 * already `true`: a participant in an earlier state renders no action at
 * all (see `LiveOperationsParticipantRow`), so there is nothing to explain.
 * The three messages are deliberately specific — matching the pinned
 * backend's own three rejection paths inside `verificarChecklistCierre` —
 * rather than one generic "checklist not ready", so the captain knows
 * exactly what to do next (assign a template / wait for the mesero /
 * approve it themselves).
 */
export function getSalidaBlockReason(
  closureChecklist: ClosureChecklistViewModel | undefined,
): string | undefined {
  if (!closureChecklist) {
    return 'Asigna un checklist de salida antes de registrar la salida.'
  }
  if (closureChecklist.status === 'pending') {
    return 'El mesero debe completar su checklist de salida.'
  }
  if (closureChecklist.status === 'completed') {
    return 'El checklist de salida está pendiente de aprobación.'
  }
  return undefined
}

/**
 * Label + tone for the exit checklist's `status` — three values, mirroring
 * `MontageChecklistStatus`'s own labels/tones
 * (`features/events/montage/utils/montagePresentation.ts`), now that
 * `'approved'` here is backed by the same kind of real, persisted signal
 * (`aprobado_en`) montage's own `'approved'` already was (`checklist_ok`).
 * `ClosureChecklistApprovalStatus`'s `'approving'`/`'error'` are the
 * in-flight mutation UI state, shown separately, not folded into this map.
 */
export const CLOSURE_CHECKLIST_STATUS_LABELS: Record<ClosureChecklistStatus, string> = {
  pending: 'Checklist de salida pendiente',
  completed: 'Pendiente de aprobación',
  approved: 'Checklist de salida aprobado',
}

export const CLOSURE_CHECKLIST_STATUS_TONES: Record<ClosureChecklistStatus, Tone> = {
  pending: 'neutral',
  completed: 'warning',
  approved: 'success',
}
