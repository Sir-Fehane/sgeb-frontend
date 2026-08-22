import { AuditLogActionBadge } from '@/features/audit-log/components/AuditLogActionBadge'
import type { AuditLogEntryViewModel } from '@/features/audit-log/types/auditLog'
import {
  formatAuditLogActor,
  formatAuditLogTimestamp,
} from '@/features/audit-log/utils/auditLogFormatting'
import { formatAuditLogEntityType } from '@/features/audit-log/utils/auditLogPresentation'

export interface AuditLogTableProps {
  entries: readonly AuditLogEntryViewModel[]
}

const HEADER_CELL_CLASS = 'px-4 py-2 text-left font-normal whitespace-nowrap'
const DATA_CELL_CLASS = 'px-4 py-2 align-top'

/**
 * The chronological audit-log table — a real `<table>`, same convention
 * `WaiterPerformanceTable` establishes for dense administrative data, over
 * the list-of-cards convention `WaiterList`/`InvitationsSection` use for a
 * roster. `detalle` is already a human-readable Spanish description composed
 * server-side (see `types/auditLog.ts`) and is rendered directly — no raw
 * JSON metadata dump, per this branch's "progressive disclosure, never
 * secrets/internal technical data" instruction (there is no further
 * metadata field on this backend's `MovimientoBitacora` to disclose in the
 * first place — `detalle` is the whole story). Actor renders via
 * `formatAuditLogActor` (a shortened uuid, `title` holds the full value) —
 * see that helper's own comment for why name resolution isn't built here.
 */
export function AuditLogTable({ entries }: AuditLogTableProps) {
  return (
    <div className="border-border overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[720px] text-left font-sans text-body-sm">
        <caption className="sr-only">Bitácora de movimientos del sistema</caption>
        <thead>
          <tr className="border-border bg-muted/40 border-b">
            <th scope="col" className={HEADER_CELL_CLASS}>
              Fecha y hora
            </th>
            <th scope="col" className={HEADER_CELL_CLASS}>
              Actor
            </th>
            <th scope="col" className={HEADER_CELL_CLASS}>
              Acción
            </th>
            <th scope="col" className={HEADER_CELL_CLASS}>
              Tipo
            </th>
            <th scope="col" className={HEADER_CELL_CLASS}>
              Detalle
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.idBitacora} className="border-border border-b last:border-b-0">
              <td className={`${DATA_CELL_CLASS} whitespace-nowrap`}>
                {formatAuditLogTimestamp(entry.timestamp)}
              </td>
              <td
                className={`${DATA_CELL_CLASS} whitespace-nowrap`}
                title={entry.uuidUsuarioResponsable ?? undefined}
              >
                {formatAuditLogActor(entry.uuidUsuarioResponsable)}
              </td>
              <td className={DATA_CELL_CLASS}>
                <AuditLogActionBadge accion={entry.accion} />
              </td>
              <td className={`${DATA_CELL_CLASS} whitespace-nowrap`}>
                {formatAuditLogEntityType(entry.tipoEntidad)}
              </td>
              <td className={DATA_CELL_CLASS}>{entry.detalle}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
