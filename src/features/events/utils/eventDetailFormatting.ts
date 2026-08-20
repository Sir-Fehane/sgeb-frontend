/**
 * Isolated, display-only formatting for the Event Detail foundation.
 * Deliberately not shared with `features/dashboard`'s own formatters —
 * duplicating these few lines keeps each feature independently owned,
 * the same precedent `features/reports/utils/reportFormatting.ts`
 * already established for the identical MXN-formatting need.
 */

const MXN_FORMATTER = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
})

/** `tarifa_por_mesero` — display only, never a derived payroll/payment calculation. */
export function formatEventTarifa(amount: number): string {
  return MXN_FORMATTER.format(amount)
}

/** `radio_geocerca_m` — meters, display only, no map, no distance calculation. */
export function formatEventGeofenceRadius(meters: number): string {
  return `${String(meters)} m`
}

/**
 * `Evento.capitan` — joins the three name parts SGEB actually stores
 * (`nombre`, `apellido_paterno`, and the nullable `apellido_materno`) into
 * one display string, omitting `apellido_materno` gracefully when absent
 * rather than rendering a dangling extra space.
 */
export function formatCaptainName(capitan: {
  nombre: string
  apellidoPaterno: string
  apellidoMaterno: string | null
}): string {
  return [capitan.nombre, capitan.apellidoPaterno, capitan.apellidoMaterno]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(' ')
}

/**
 * The address pieces `formatSalonAddress` reads — a subset of
 * `services/salonesApi.ts`'s `SalonDetailViewModel`, kept as its own
 * loose/optional shape here (rather than importing that interface
 * directly) so this formatter stays testable in isolation and usable
 * against a partial record.
 */
export interface SalonAddressParts {
  calle?: string | undefined
  colonia?: string | undefined
  cp?: string | undefined
  ciudad?: string | undefined
  estado?: string | undefined
}

/**
 * A single, human-readable address line — built ONLY from fields the
 * resolved Salón record actually carries (never a fabricated address
 * component). Blank/missing pieces are omitted gracefully rather than
 * rendered as "undefined" or leaving a dangling `·` separator; `null` when
 * nothing at all is available (`EventDetailGeofenceSection` then simply
 * doesn't render an address line).
 *
 * `ciudad`/`estado` combine into one "Ciudad, Estado" piece (not two
 * separate `·`-joined pieces) to read naturally, matching how a Mexican
 * postal address is conventionally written.
 */
export function formatSalonAddress(salon: SalonAddressParts): string | null {
  const ciudadEstado = [salon.ciudad, salon.estado]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(', ')

  const parts = [
    salon.calle?.trim(),
    salon.colonia?.trim() ? `Col. ${salon.colonia.trim()}` : undefined,
    ciudadEstado || undefined,
    salon.cp?.trim() ? `CP ${salon.cp.trim()}` : undefined,
  ].filter((part): part is string => Boolean(part))

  return parts.length > 0 ? parts.join(' · ') : null
}

/**
 * `fecha` — a `date`-only ISO string (`YYYY-MM-DD`), formatted as
 * `DD/MM/YYYY` without ever constructing a `Date` from it:
 * `new Date('2026-08-05')` parses as UTC midnight, which rolls back to
 * the previous day once rendered in a negative-offset timezone. Splitting
 * the string avoids that entirely — same pattern as
 * `features/dashboard/utils/dashboardFormatting.ts`'s `formatDashboardDate`.
 */
const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export function formatEventDate(dateOnly: string): string {
  const match = DATE_ONLY_PATTERN.exec(dateOnly)
  if (!match) {
    return dateOnly
  }
  const [, year, month, day] = match
  return `${day}/${month}/${year}`
}

/**
 * `inicio` — a full `date-time` string (`EventoCrear.inicio`,
 * `format: date-time`). Unlike `fecha`, the OpenAPI document does not
 * guarantee this value carries no UTC offset — a real backend response
 * could legitimately be naive (`2026-09-12T18:00:00`), UTC
 * (`2026-09-12T18:00:00Z`), or a numeric offset
 * (`2026-09-12T12:00:00-06:00`). This does not need `formatEventDate`'s
 * string-splitting workaround: unlike a bare `YYYY-MM-DD` date (which
 * `Date` always parses as UTC midnight, per the ECMAScript Date Time
 * String Format), a date-*time* string parses per its own offset when one
 * is present, and as local wall-clock time when one is absent — both are
 * exactly the intended instant/value in every case, so delegating
 * straight to `new Date(...)` here is correct for all three forms. See
 * `eventDetailFormatting.test.ts` for tests covering all three,
 * including a same-instant Z/numeric-offset equivalence check.
 */
export function formatEventDateTime(dateTime: string): string {
  return new Date(dateTime).toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

/**
 * `inicio`'s TIME component only — used where the date is already shown
 * separately (`EventDetailScheduleSection`'s own "Fecha" row), so the
 * event's start is never presented as two redundant full dates. Same
 * parsing rules as `formatEventDateTime` (delegates straight to `Date`,
 * correct for naive/Z/offset forms alike); only the requested style
 * differs.
 */
export function formatEventTime(dateTime: string): string {
  return new Date(dateTime).toLocaleString('es-MX', { timeStyle: 'short' })
}

/**
 * `horaPresentacion` — a bare time-of-day string, NOT a full date-time
 * (`hora_presentacion`'s wire value: `HH:MM` as sent by the native
 * `<input type="time">` this value comes from, or `HH:MM:SS` once
 * round-tripped through a real `GET` response — the backend echoes a
 * `:00` seconds component that field never actually captures). Formatted
 * with the exact same es-MX 12-hour convention `formatEventTime` already
 * uses for `inicio`, so `EventDetailScheduleSection`'s two time rows read
 * consistently instead of one showing a raw "18:00:00" wire string next
 * to the other's localized "6:09 p. m.".
 *
 * Deliberately never parses this as a `Date` directly (`new
 * Date('18:00:00')` is invalid per the ECMAScript Date Time String
 * Format — a bare time has no date component — and an engine that DOES
 * accept it as a non-standard fallback typically treats it as UTC,
 * shifting the displayed clock time by the local offset). Instead builds
 * a `Date` for right now and overwrites only its hour/minute via the
 * LOCAL `setHours` setter, then formats that same local `Date` directly —
 * never round-tripped through `toISOString`/UTC — so the exact hour and
 * minute the string names is the exact hour and minute shown, regardless
 * of the runtime's timezone. Seconds are always dropped: this value is
 * never user-configurable to second precision, so it is never displayed
 * to that precision either.
 */
const PRESENTATION_TIME_PATTERN = /^(\d{2}):(\d{2})(?::\d{2})?$/

export function formatEventPresentationTime(horaPresentacion: string): string {
  const match = PRESENTATION_TIME_PATTERN.exec(horaPresentacion)
  if (!match) {
    return horaPresentacion
  }
  const [, hours, minutes] = match
  const reference = new Date()
  reference.setHours(Number(hours), Number(minutes), 0, 0)
  return reference.toLocaleTimeString('es-MX', { timeStyle: 'short' })
}
