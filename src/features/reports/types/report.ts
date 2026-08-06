/**
 * UI domain types for the waiter-performance report, derived directly
 * from docs/api/openapi-sgeb.yaml v1.6.0's `GET /dashboard/meseros`
 * endpoint and its `DesempenoMesero` response item. This is the ONLY
 * backing contract for this feature — event-specific endpoints
 * (`reportes-merma`, `cierre`, `pagos`) are separate, out-of-scope
 * features, not alternate sources for this screen.
 */

/**
 * Mirrors `DesempenoMesero` field-for-field — one historical aggregate
 * row per waiter over the requested date range. Every field here has a
 * direct, documented counterpart; nothing is invented (no teléfono,
 * correo, número de empleado, named missed events, "latest event",
 * trend, rank, or previous-period comparison exists on the documented
 * schema, so none exists here either).
 */
export interface WaiterPerformanceReportItem {
  /**
   * `DesempenoMesero.uuid_usuario` — an opaque public identifier. Never
   * parsed, validated, converted to an integer, or rendered as visible
   * text anywhere in this feature; `nombreCompleto` is the only
   * waiter-identifying text ever shown.
   */
  uuidUsuario: string
  nombreCompleto: string
  eventosApartados: number
  asistenciasConfirmadas: number
  inasistencias: number
  /** `DesempenoMesero.porcentaje_asistencia` — rendered verbatim, never clamped or rewritten. */
  porcentajeAsistencia: number
  /** `DesempenoMesero.calificacion_promedio` — `null` renders as "Sin calificaciones", never averaged client-side. */
  calificacionPromedio: number | null
  calificacionesRecibidas: number
  /** MXN, per the schema's own description. */
  montoPagado: number
  /** MXN. Not an invitation to trigger a payment from this screen — no payment action exists here. */
  montoPendiente: number
  /**
   * `DesempenoMesero.clabe_vigente` — a boolean status only. The actual
   * CLABE value is never part of this schema and must never be
   * displayed or fabricated here.
   */
  clabeVigente: boolean
}

/** `GET /dashboard/meseros`'s documented `orden` enum — exactly these three values, no others. */
export type WaiterPerformanceOrder = 'calificacion' | 'asistencias' | 'monto_pagado'

/**
 * Local, typed filter state for the report — mirrors only the
 * user-facing query parameters this branch exposes honestly:
 * `fecha_desde`, `fecha_hasta`, `orden`. Deliberately excludes
 * `uuid_usuario` — the endpoint supports it, but no approved
 * waiter-selector integration exists in this branch (loading the waiter
 * directory here is out of scope); a future integration would source it
 * from that approved selector, never from a raw UUID text input — and
 * `page`/`page_size`, since the response documents no pagination
 * metadata (`total`/`total_pages`/etc.) to build honest controls against.
 */
export interface ReportFilterState {
  fechaDesde: string
  fechaHasta: string
  orden: WaiterPerformanceOrder
}
