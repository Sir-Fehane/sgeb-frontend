import { z } from 'zod'

const TITULO_MIN = 3
const TITULO_MAX = 120
const CUPO_MESEROS_MIN = 1
const CUPO_MESEROS_MAX = 500
const NUM_MESAS_MIN = 1
const NUM_MESAS_MAX = 255
const TARIFA_MIN = 0
const TARIFA_MAX = 9999.99
const RADIO_GEOCERCA_MIN = 10
const RADIO_GEOCERCA_MAX = 1000

const TWO_DECIMALS_PATTERN = /^\d+(\.\d{1,2})?$/

/**
 * Client-side validation for `PUT /eventos/{id}` — a genuine subset of
 * `createEventFormSchema`'s fields (same numeric limits, confirmed against
 * the same pinned backend `actualizarEventoValidator`), not the full
 * create field set: `id_salon`/`fecha`/`hora_presentacion`/`inicio` are not
 * accepted by this endpoint at all (see `eventsApi.ts`'s
 * `UpdateEventoRequest` for the full writeup), so they are not schema
 * fields here either — there is no form control for them to validate.
 *
 * `radio_geocerca_m` keeps its own range validation (still enforced
 * whenever the field IS submitted), but whether it is submitted at all is
 * an `EventEditForm` concern, not this schema's: the pinned backend
 * rejects the whole request with `SGEB-4013` if this key is present while
 * `estado !== 'borrador'`, even with an unchanged value — so the field is
 * disabled and excluded from the outgoing request outside `borrador`,
 * never merely disabled while still submitting the current value.
 *
 * Deliberately does NOT cross-check `num_mesas` against the event's salón
 * capacity (`SGEB-4007`) the way the create schema does: `EventDetailViewModel`
 * carries no `idSalon`/salón-capacity field for this page to check against
 * (see that type's own comment — no documented `/eventos/{id}` response
 * schema confirms one), so this is left to the server's own authoritative
 * `SGEB-4007` response instead of fabricating a client-side guess.
 */
export const editEventFormSchema = z.object({
  titulo: z
    .string()
    .min(TITULO_MIN, `El título debe tener al menos ${String(TITULO_MIN)} caracteres.`)
    .max(TITULO_MAX, `El título no puede superar ${String(TITULO_MAX)} caracteres.`),
  tipo: z.enum(['social', 'empresarial'], { error: 'Selecciona un tipo de evento.' }),
  cupo_meseros: z
    .number({ error: 'Ingresa el cupo de meseros.' })
    .int()
    .min(
      CUPO_MESEROS_MIN,
      `El cupo de meseros debe ser al menos ${String(CUPO_MESEROS_MIN)}.`,
    )
    .max(
      CUPO_MESEROS_MAX,
      `El cupo de meseros no puede superar ${String(CUPO_MESEROS_MAX)}.`,
    ),
  num_mesas: z
    .number({ error: 'Ingresa el número de mesas.' })
    .int()
    .min(NUM_MESAS_MIN, `El número de mesas debe ser al menos ${String(NUM_MESAS_MIN)}.`)
    .max(NUM_MESAS_MAX, `El número de mesas no puede superar ${String(NUM_MESAS_MAX)}.`),
  tarifa_por_mesero: z
    .number({ error: 'Ingresa la tarifa por mesero.' })
    .min(TARIFA_MIN, 'La tarifa no puede ser negativa.')
    .max(TARIFA_MAX, `La tarifa no puede superar ${String(TARIFA_MAX)}.`)
    .refine(
      (value) => TWO_DECIMALS_PATTERN.test(String(value)),
      'La tarifa admite máximo 2 decimales.',
    ),
  radio_geocerca_m: z
    .number({ error: 'Ingresa el radio de la geocerca.' })
    .int()
    .min(
      RADIO_GEOCERCA_MIN,
      `El radio debe ser al menos ${String(RADIO_GEOCERCA_MIN)} m.`,
    )
    .max(
      RADIO_GEOCERCA_MAX,
      `El radio no puede superar ${String(RADIO_GEOCERCA_MAX)} m.`,
    ),
})

export type EventEditFormValues = z.infer<typeof editEventFormSchema>
