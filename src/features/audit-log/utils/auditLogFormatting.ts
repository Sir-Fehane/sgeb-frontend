/** `timestamp` is a full ISO date-time — same `es-MX` medium-date/short-time style `features/events/utils/eventDetailFormatting.ts`'s `formatEventDateTime` uses, duplicated locally rather than imported (unrelated feature domain, one-line formatter). */
export function formatAuditLogTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const UUID_PREFIX_LENGTH = 8

/**
 * The pinned backend's `GET /admin/bitacora` returns only
 * `uuid_usuario_responsable` — never a resolved name (`MovimientoBitacora`
 * has no `UsuarioBreve`-style preload, confirmed against
 * `bitacora_service.ts`). Resolving it to a display name would require an
 * extra `GET /usuarios/{uuid}` per distinct actor; deferred as a follow-up
 * rather than built here (see this branch's report) to keep this feature's
 * first version self-contained and its test surface bounded. `null` means a
 * system/automatic movement (e.g. a Cubaitor job), never a missing value.
 */
export function formatAuditLogActor(uuidUsuarioResponsable: string | null): string {
  if (uuidUsuarioResponsable === null) {
    return 'Sistema (automático)'
  }
  return `${uuidUsuarioResponsable.slice(0, UUID_PREFIX_LENGTH)}…`
}
