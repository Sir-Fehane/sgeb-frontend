import type { WaiterPerformanceRowViewModel } from '@/features/reports/types/report'
import {
  formatReportMxn,
  formatReportRating,
  formatReportResponseTime,
} from '@/features/reports/utils/reportFormatting'

export interface WaiterPerformanceTableProps {
  rows: readonly WaiterPerformanceRowViewModel[]
}

const HEADER_CELL_CLASS = 'px-4 py-2 text-right font-normal whitespace-nowrap'
const DATA_CELL_CLASS = 'px-4 py-2 text-right tabular-nums whitespace-nowrap'

/**
 * The historical waiter-performance table — metrics grouped into the four
 * families this branch's own audit identified (Asistencia / Servicio /
 * Calidad / Pagos) instead of 12 flat columns, per the task's
 * information-hierarchy requirement. `puntualidad` is deliberately never a
 * column here: the pinned backend always returns it as `null` (a
 * discarded metric, not a pending one — see `WaiterPerformanceRowViewModel`'s
 * comment), and a column of nothing but "—" would carry zero information.
 *
 * A real `<table>`, not the list-of-cards convention every other roster in
 * this app uses (`WaiterList`, invitation lists) — a dense numeric
 * comparison across many meseros reads far better as aligned rows/columns
 * than as repeated cards, and semantic `<th scope>` keeps it just as
 * accessible. Wrapped in `overflow-x-auto` with a `min-width` so a
 * narrower tablet viewport scrolls the table horizontally instead of
 * squashing the numbers illegibly.
 */
export function WaiterPerformanceTable({ rows }: WaiterPerformanceTableProps) {
  return (
    <div className="border-border overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[880px] text-left font-sans text-body-sm">
        <caption className="sr-only">
          Desempeño histórico de meseros para el periodo seleccionado
        </caption>
        <thead>
          <tr className="border-border bg-muted/40 border-b">
            <th rowSpan={2} scope="col" className="px-4 py-2 align-bottom">
              Mesero
            </th>
            <th
              colSpan={3}
              scope="colgroup"
              className="text-muted-foreground px-4 py-1 text-center"
            >
              Asistencia
            </th>
            <th
              colSpan={2}
              scope="colgroup"
              className="text-muted-foreground px-4 py-1 text-center"
            >
              Servicio
            </th>
            <th
              colSpan={2}
              scope="colgroup"
              className="text-muted-foreground px-4 py-1 text-center"
            >
              Calidad
            </th>
            <th
              colSpan={3}
              scope="colgroup"
              className="text-muted-foreground px-4 py-1 text-center"
            >
              Pagos
            </th>
          </tr>
          <tr className="border-border border-b">
            <th scope="col" className={HEADER_CELL_CLASS}>
              Eventos
            </th>
            <th scope="col" className={HEADER_CELL_CLASS}>
              Asistencias
            </th>
            <th scope="col" className={HEADER_CELL_CLASS}>
              Faltas
            </th>
            <th scope="col" className={HEADER_CELL_CLASS}>
              Solicitudes
            </th>
            <th scope="col" className={HEADER_CELL_CLASS}>
              Tiempo prom.
            </th>
            <th scope="col" className={HEADER_CELL_CLASS}>
              Calificación
            </th>
            <th scope="col" className={HEADER_CELL_CLASS}>
              Bajas
            </th>
            <th scope="col" className={HEADER_CELL_CLASS}>
              Acumulado
            </th>
            <th scope="col" className={HEADER_CELL_CLASS}>
              Recibido
            </th>
            <th scope="col" className={HEADER_CELL_CLASS}>
              Por cobrar
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.uuidUsuario} className="border-border border-b last:border-b-0">
              <th scope="row" className="px-4 py-2 font-medium whitespace-nowrap">
                {row.nombreCompleto}
              </th>
              <td className={DATA_CELL_CLASS}>{row.eventosTrabajados}</td>
              <td className={DATA_CELL_CLASS}>{row.asistencias}</td>
              <td className={DATA_CELL_CLASS}>{row.faltas}</td>
              <td className={DATA_CELL_CLASS}>{row.solicitudesAtendidas}</td>
              <td className={DATA_CELL_CLASS}>
                {formatReportResponseTime(row.segundosRespuestaPromedio)}
              </td>
              <td className={DATA_CELL_CLASS}>
                {formatReportRating(row.promedioCalificacion)}
              </td>
              <td className={DATA_CELL_CLASS}>{row.calificacionesBajas}</td>
              <td className={DATA_CELL_CLASS}>{formatReportMxn(row.pagosAcumulados)}</td>
              <td className={DATA_CELL_CLASS}>{formatReportMxn(row.pagosRecibidos)}</td>
              <td className={DATA_CELL_CLASS}>{formatReportMxn(row.porCobrar)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
