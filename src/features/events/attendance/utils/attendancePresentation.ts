import type { Tone } from '@/shared/components'
import type {
  ArrivalConfirmationViewModel,
  ArrivalMetodo,
  ArrivalMotivoFallo,
  AttendanceParticipationEstado,
} from '@/features/events/attendance/types/attendance'

/**
 * Presentational label + tone for each `estadoParticipacion` value — a
 * display decision this feature owns (per
 * docs/FrontendArchitecture.md §11: "do that mapping inside the feature
 * that owns the status"), mirroring
 * `features/events/utils/eventStatusPresentation.ts`'s established
 * pattern. The tone alone never carries the meaning; every row also
 * renders the text label.
 */
export const PARTICIPATION_LABELS: Record<AttendanceParticipationEstado, string> = {
  seleccionado: 'Seleccionado',
  confirmo_asistencia: 'Asistencia confirmada',
  confirmo_llegada: 'Llegada confirmada',
}

export const PARTICIPATION_TONES: Record<AttendanceParticipationEstado, Tone> = {
  seleccionado: 'neutral',
  confirmo_asistencia: 'info',
  confirmo_llegada: 'success',
}

export const ARRIVAL_METODO_LABELS: Record<ArrivalMetodo, string> = {
  huella: 'Huella',
  face_id: 'Face ID',
  ninguno: 'Sin biometría',
}

export interface MotivoFalloPresentation {
  label: string
  tone: Tone
  /**
   * Whether this specific motive warrants an explicit "Requiere
   * revisión" call-out. `false` only for `precision_insuficiente`
   * (SGEB-4026) — the error dictionary explicitly documents it as an
   * inconclusive measurement, "no se registra como asistencia
   * denegada", distinct from a genuine denial (SGEB-4003). Never
   * flattened to the same presentation as the other four motives.
   */
  requiresReview: boolean
}

/**
 * `dispositivo_de_otro_usuario` (SGEB-4025) is documented as an explicit
 * collusion signal — "se alerta al capitán" — and is the only motive
 * presented with `tone: 'danger'`; the other three denial/failure
 * motives use `tone: 'warning'` (real problems, but not evidence of
 * wrongdoing). `precision_insuficiente` (SGEB-4026) uses `tone: 'info'`
 * and `requiresReview: false` — an inconclusive GPS reading, not a
 * failure at all.
 */
export const MOTIVO_FALLO_PRESENTATION: Record<
  ArrivalMotivoFallo,
  MotivoFalloPresentation
> = {
  fuera_geocerca: {
    label: 'Fuera de la geocerca del evento',
    tone: 'warning',
    requiresReview: true,
  },
  biometria_fallida: {
    label: 'Verificación biométrica fallida',
    tone: 'warning',
    requiresReview: true,
  },
  dispositivo_no_vinculado: {
    label: 'Dispositivo no vinculado a este usuario',
    tone: 'warning',
    requiresReview: true,
  },
  dispositivo_de_otro_usuario: {
    label: 'Dispositivo registrado a nombre de otro mesero',
    tone: 'danger',
    requiresReview: true,
  },
  precision_insuficiente: {
    label: 'Medición de ubicación inconclusa',
    tone: 'info',
    requiresReview: false,
  },
}

/**
 * The single source of truth for "does this arrival attempt need captain
 * attention" — reused by both `EventAttendanceContent`'s summary total and
 * `EventAttendanceParticipantRow`'s row-level badge, so the two never
 * drift apart. A `fallido` result with no `motivoFallo` (nullable per the
 * `ConfirmacionLlegada` schema) has no documented reason to flag as
 * requiring review, so it is conservatively excluded here rather than
 * assumed — never counted, never invented a reason for.
 */
export function arrivalRequiresAttention(
  arrival: ArrivalConfirmationViewModel | undefined,
): boolean {
  if (arrival?.resultado !== 'fallido' || !arrival.motivoFallo) {
    return false
  }
  return MOTIVO_FALLO_PRESENTATION[arrival.motivoFallo].requiresReview
}
