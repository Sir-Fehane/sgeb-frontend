/**
 * Shared scheduling helpers for Event Create's simplified date/time UX
 * (`fecha` + `hora_presentacion` + `hora_inicio`, no duplicate date entry —
 * see `createEventFormSchema`/`EventCreateForm`). Isolated here so the
 * schema's cross-field validation and `EventCreatePage`'s request-building
 * derive `inicio` from exactly the same logic, never two independent
 * implementations that could drift.
 */

/**
 * Today's date in the browser's LOCAL calendar (`YYYY-MM-DD`), used as the
 * native date input's `min` and the "not before today" Zod rule (SGEB-2007).
 *
 * Deliberately uses `getFullYear`/`getMonth`/`getDate` (local wall-clock
 * accessors), never `toISOString().slice(0, 10)`: `toISOString` always
 * renders UTC, so near local midnight in a negative UTC offset (e.g.
 * Mexico, UTC-6) it would report tomorrow's UTC date while it is still
 * today locally — silently blocking a genuinely valid "today" selection.
 */
export function getTodayIsoDate(): string {
  const now = new Date()
  const year = String(now.getFullYear())
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Combines the single `fecha` (`YYYY-MM-DD`) the user picks once with the
 * `hora_inicio` time (`HH:MM`) into the exact naive, no-offset datetime
 * string the pinned backend's `inicio` field already expects — the same
 * shape a `datetime-local` input previously produced verbatim (see this
 * branch's report). No timezone conversion is introduced: this is a plain
 * string join, preserving the existing wire convention rather than
 * inventing a UTC/offset variant.
 */
export function buildInicioDateTime(fecha: string, horaInicio: string): string {
  return `${fecha}T${horaInicio}`
}
