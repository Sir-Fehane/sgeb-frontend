import type { Tone } from '@/shared/components'
import type {
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
 * The single source of truth for "may the captain/admin mark this
 * participant as salida" — reused by the row's action visibility and any
 * future guard, so the two never drift apart. Matches the pinned backend's
 * `TRANSICIONES` map exactly: `vinculo` is the only state whose sole legal
 * next state is `salida`.
 */
export function isEligibleForSalida(estado: LiveOperationsParticipantEstado): boolean {
  return estado === 'vinculo'
}
