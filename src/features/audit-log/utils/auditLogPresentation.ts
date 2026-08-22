import type { Tone } from '@/shared/components'
import type {
  AuditLogAction,
  KnownAuditLogEntityType,
} from '@/features/audit-log/types/auditLog'

/** `MovimientoBitacora.accion` — real enum labels (see `types/auditLog.ts`'s module comment for why this is NOT OpenAPI's `alta`/`actualizacion`/`cambio_estado`/`baja`). */
export const AUDIT_LOG_ACTION_LABELS: Record<AuditLogAction, string> = {
  crear: 'Alta',
  actualizar: 'Actualización',
  desactivar: 'Desactivación',
  activar: 'Activación',
  eliminar: 'Eliminación',
  aprobar: 'Aprobación',
  cancelar: 'Cancelación',
}

export const AUDIT_LOG_ACTION_TONES: Record<AuditLogAction, Tone> = {
  crear: 'success',
  actualizar: 'info',
  desactivar: 'warning',
  activar: 'success',
  eliminar: 'danger',
  aprobar: 'success',
  cancelar: 'warning',
}

/** Spanish labels for the known, observed `tipoEntidad` values — see `types/auditLog.ts`'s `KNOWN_AUDIT_LOG_ENTITY_TYPES`. */
const KNOWN_ENTITY_TYPE_LABELS: Record<KnownAuditLogEntityType, string> = {
  USUARIO: 'Usuario',
  DATOS_BANCARIOS: 'Datos bancarios',
  INVITACION: 'Invitación',
  COMANDA_EVENTO: 'Comanda de evento',
}

/**
 * Maps a known `tipoEntidad` to its Spanish label; an unrecognized value
 * (a future backend module this frontend doesn't know about yet) falls back
 * to the raw string as-is rather than an invented label or a blank cell —
 * per this branch's report: "if an unknown action arrives, show a safe
 * fallback label/string."
 */
export function formatAuditLogEntityType(tipoEntidad: string): string {
  return (
    (KNOWN_ENTITY_TYPE_LABELS as Record<string, string | undefined>)[tipoEntidad] ??
    tipoEntidad
  )
}

/** Same fallback contract as `formatAuditLogEntityType`, for an `accion` value outside the documented enum (defensive — the backend enum is closed, but a wire response is never fully trusted). */
export function formatAuditLogAction(accion: string): string {
  return (AUDIT_LOG_ACTION_LABELS as Record<string, string | undefined>)[accion] ?? accion
}
