import { z } from 'zod'

import type { EventSalonOption } from '@/features/events/types/event'

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

const HORA_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/
const TWO_DECIMALS_PATTERN = /^\d+(\.\d{1,2})?$/

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Mirrors a subset of `EventoCrear` (docs/api/openapi-sgeb.yaml v1.6.0)
 * as a **field-validation prototype**, not the approved creation
 * workflow — see `EventCreateFieldPrototypePage`. Two fields from
 * `EventoCrear` are deliberately absent here, not merely unvalidated —
 * both are **integration-owned**, meaning a future request-composition
 * layer must combine this prototype's validated values with these two
 * fields before the result is a real `POST /eventos` payload:
 *
 * - `uuid_capitan`: required by the confirmed contract, but this
 *   prototype has no authentication, role resolution, or approved
 *   captain-selection wireframe to source it from (session-derived vs.
 *   an admin picker is still an open product question). No selector
 *   exists anywhere in this feature for it — adding one, or a fake
 *   captain list, would be guessing at an unapproved flow.
 * - `comanda_url`: the upload/authoring workflow that would produce
 *   this value is unresolved (no upload endpoint is documented,
 *   docs/FrontendArchitecture.md §7.5) — asking a user to hand-type a
 *   technical URL is not a real workflow either, so the field is
 *   omitted rather than faked.
 *
 * `titulo`'s length rule is now confirmed by `openapi-sgeb.yaml` v1.6.0
 * (`minLength: 3, maxLength: 120`) — the previous 40-vs-120 conflict
 * against the data dictionary's raw column-type text is resolved in
 * favor of the OpenAPI schema, the definitive source of truth.
 *
 * Also includes two documented cross-field business rules, enforced
 * client-side as a first-pass check (the server remains authoritative):
 *
 * - SGEB-2007 — `fecha` must not be before today.
 * - SGEB-2008 — `inicio`'s date component must match `fecha`, and
 *   `inicio` must not be in the past.
 * - SGEB-4007 — `num_mesas` must not exceed the selected salón's
 *   `capacidad_max_mesas`. This one needs the salón options list, so
 *   the schema is built by a factory rather than exported as a static
 *   constant.
 *
 * Field-name note: the schema's own keys use the exact documented
 * snake_case wire names (`id_salon`, `hora_presentacion`, etc.) since
 * this is the shape a future integration layer would send verbatim to
 * `POST /eventos` — see `EventCreateForm` for the camelCase UI-facing
 * field names RHF actually binds to.
 */
export function createEventFormSchema(salones: readonly EventSalonOption[]) {
  return z
    .object({
      id_salon: z.number({ error: 'Selecciona un salón.' }).int().min(1),
      /** `EventoCrear.titulo` — `minLength: 3, maxLength: 120`, confirmed by `openapi-sgeb.yaml` v1.6.0. */
      titulo: z
        .string()
        .min(
          TITULO_MIN,
          `El título debe tener al menos ${String(TITULO_MIN)} caracteres.`,
        )
        .max(TITULO_MAX, `El título no puede superar ${String(TITULO_MAX)} caracteres.`),
      tipo: z.enum(['social', 'empresarial'], { error: 'Selecciona un tipo de evento.' }),
      fecha: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ingresa una fecha válida.')
        .refine(
          (fecha) => fecha >= todayIsoDate(),
          'La fecha del evento no puede ser anterior a hoy.',
        ),
      hora_presentacion: z
        .string()
        .regex(HORA_PATTERN, 'Ingresa una hora válida (HH:MM).'),
      inicio: z
        .string()
        .min(1, 'Ingresa la fecha y hora de inicio.')
        .refine(
          (value) => !Number.isNaN(Date.parse(value)),
          'Ingresa una fecha y hora válidas.',
        ),
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
        .min(
          NUM_MESAS_MIN,
          `El número de mesas debe ser al menos ${String(NUM_MESAS_MIN)}.`,
        )
        .max(
          NUM_MESAS_MAX,
          `El número de mesas no puede superar ${String(NUM_MESAS_MAX)}.`,
        ),
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
    .superRefine((data, ctx) => {
      const inicioDate = data.inicio.slice(0, 10)
      if (inicioDate !== data.fecha) {
        ctx.addIssue({
          code: 'custom',
          path: ['inicio'],
          message: 'La fecha de inicio debe coincidir con la fecha del evento.',
        })
      }
      if (!Number.isNaN(Date.parse(data.inicio)) && new Date(data.inicio) < new Date()) {
        ctx.addIssue({
          code: 'custom',
          path: ['inicio'],
          message: 'La fecha y hora de inicio no pueden ser anteriores a este momento.',
        })
      }

      const salon = salones.find((option) => option.idSalon === data.id_salon)
      if (salon && data.num_mesas > salon.capacidadMaxMesas) {
        ctx.addIssue({
          code: 'custom',
          path: ['num_mesas'],
          message: `El número de mesas no puede superar la capacidad del salón (${String(salon.capacidadMaxMesas)}).`,
        })
      }
    })
}

/**
 * NOT the `EventoCrear` request DTO, and NOT an `EventoCrearRequest`/
 * `EventoCrearDto` — this is the value shape of the field-validation
 * prototype only, and it is incomplete relative to `EventoCrear`. It
 * deliberately omits two integration-owned fields (`uuid_capitan`,
 * `comanda_url` — see `createEventFormSchema`'s comment for why), and
 * has never been confirmed against the real five-step wireframe. Do
 * not use this type to construct a `POST /eventos` payload directly; a
 * future request-composition layer must combine these validated values
 * with `uuid_capitan` (from the authenticated captain or an approved
 * admin-selection flow) and `comanda_url`/an upload result (once its
 * contract is defined) before the result is a real `EventoCrear`
 * request. No such mapper exists yet — that is a later branch's job,
 * once the wizard's actual steps and these two fields are resolved.
 */
export type EventCreateFieldPrototypeValues = z.infer<
  ReturnType<typeof createEventFormSchema>
>
