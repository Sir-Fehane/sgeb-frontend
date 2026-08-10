import type { Tone } from '@/shared/components'
import type {
  MesaEstado,
  MontageChecklistStatus,
} from '@/features/events/montage/types/montage'

/**
 * Presentational label + tone for each checklist `status` value — a
 * display decision this feature owns (per
 * docs/FrontendArchitecture.md §11: "do that mapping inside the feature
 * that owns the status"), mirroring
 * `features/events/attendance/utils/attendancePresentation.ts`'s
 * established pattern. Tone alone never carries the meaning; every render
 * site also shows the text label.
 */
export const CHECKLIST_STATUS_LABELS: Record<MontageChecklistStatus, string> = {
  pending: 'Checklist pendiente',
  completed: 'Checklist completo · sin aprobar',
  approved: 'Checklist aprobado',
}

export const CHECKLIST_STATUS_TONES: Record<MontageChecklistStatus, Tone> = {
  pending: 'neutral',
  completed: 'warning',
  approved: 'success',
}

export const MESA_ESTADO_LABELS: Record<MesaEstado, string> = {
  libre: 'Libre',
  ocupada: 'Ocupada',
}

export const MESA_ESTADO_TONES: Record<MesaEstado, Tone> = {
  libre: 'success',
  ocupada: 'neutral',
}
