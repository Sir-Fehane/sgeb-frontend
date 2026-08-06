import type { WaiterPerformanceReportItem } from '@/features/reports/types/report'
import {
  formatClabeStatus,
  formatReportMxn,
  formatReportRating,
} from '@/features/reports/utils/reportFormatting'
import { Caption } from '@/shared/components'

export interface WaiterPerformanceTableProps {
  items: readonly WaiterPerformanceReportItem[]
}

const HEADER_CLASSES =
  'px-3 py-2 text-left font-sans text-label font-semibold text-muted-foreground'
const CELL_CLASSES = 'px-3 py-3 font-sans text-body-sm align-top'

/**
 * Renders exactly the documented `DesempenoMesero` fields — no chart
 * data, no aggregate summary row, no fake rank. Rows are plain `<tr>`s
 * (never a link or button): no waiter-detail route is approved, and no
 * per-row action (payment, invitation, account edit) is documented.
 * `uuidUsuario` is never rendered anywhere in this table.
 *
 * The table scrolls horizontally inside its own container on narrow
 * viewports rather than duplicating a separate mobile card layout —
 * exactly one DOM representation per row, at every width.
 */
export function WaiterPerformanceTable({ items }: WaiterPerformanceTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse">
        <caption className="sr-only">Reporte de desempeño de meseros</caption>
        <thead>
          <tr className="border-border border-b">
            <th scope="col" className={HEADER_CLASSES}>
              Mesero
            </th>
            <th scope="col" className={HEADER_CLASSES}>
              Participación
            </th>
            <th scope="col" className={HEADER_CLASSES}>
              Asistencia
            </th>
            <th scope="col" className={HEADER_CLASSES}>
              Calificación
            </th>
            <th scope="col" className={HEADER_CLASSES}>
              Pagos
            </th>
            <th scope="col" className={HEADER_CLASSES}>
              Cuenta
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.uuidUsuario} className="border-border border-b last:border-0">
              <td className={CELL_CLASSES}>{item.nombreCompleto}</td>

              <td className={CELL_CLASSES}>
                <Caption>Eventos apartados</Caption>
                <div>{item.eventosApartados}</div>
              </td>

              <td className={CELL_CLASSES}>
                <div className="flex flex-col gap-0.5">
                  <span>
                    <Caption>Confirmadas</Caption> {item.asistenciasConfirmadas}
                  </span>
                  <span>
                    <Caption>Inasistencias</Caption> {item.inasistencias}
                  </span>
                  <span>
                    <Caption>Porcentaje</Caption> {item.porcentajeAsistencia}%
                  </span>
                </div>
              </td>

              <td className={CELL_CLASSES}>
                <div className="flex flex-col gap-0.5">
                  <span>{formatReportRating(item.calificacionPromedio)}</span>
                  <span>
                    <Caption>Calificaciones recibidas</Caption>{' '}
                    {item.calificacionesRecibidas}
                  </span>
                </div>
              </td>

              <td className={CELL_CLASSES}>
                <div className="flex flex-col gap-0.5">
                  <span>
                    <Caption>Pagado</Caption> {formatReportMxn(item.montoPagado)}
                  </span>
                  <span>
                    <Caption>Pendiente</Caption> {formatReportMxn(item.montoPendiente)}
                  </span>
                </div>
              </td>

              <td className={CELL_CLASSES}>{formatClabeStatus(item.clabeVigente)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
