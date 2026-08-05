import type { Tone } from '@/shared/components'
import type {
  AlertSeverity,
  AlertState,
  AlertType,
} from '@/features/dashboard/types/dashboard'

/** `AlertaOperativa.tipo` — presentational label only; text always accompanies severity. */
export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  botella_vacia: 'Botella vacía',
  insumo_agotado: 'Insumo agotado',
  cubaitor_sin_conexion: 'Cubaitor sin conexión',
  dispensado_error: 'Error de dispensado',
  checklist_pendiente: 'Checklist pendiente',
  llegada_fallida: 'Llegada fallida',
  calificacion_baja: 'Calificación baja',
}

/** `AlertaOperativa.severidad` — label + tone; tone alone never carries the meaning. */
export const ALERT_SEVERITY_LABELS: Record<AlertSeverity, string> = {
  informativa: 'Informativa',
  atencion: 'Atención',
  critica: 'Crítica',
}

export const ALERT_SEVERITY_TONES: Record<AlertSeverity, Tone> = {
  informativa: 'info',
  atencion: 'warning',
  critica: 'danger',
}

/** `AlertaOperativa.estado` — open vs. attended, distinguished by readable text. */
export const ALERT_STATE_LABELS: Record<AlertState, string> = {
  abierta: 'Abierta',
  atendida: 'Atendida',
}

export const ALERT_STATE_TONES: Record<AlertState, Tone> = {
  abierta: 'warning',
  atendida: 'neutral',
}
