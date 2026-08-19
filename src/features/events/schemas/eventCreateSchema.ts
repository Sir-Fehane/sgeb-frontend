import { z } from 'zod'

import {
  buildInicioDateTime,
  getTodayIsoDate,
} from '@/features/events/utils/eventScheduling'
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

/**
 * Client-side validation for the real `POST /eventos` creation flow
 * (`EventCreateForm`/`EventCreatePage`). Covers every field this form
 * captures directly; `uuid_capitan` is deliberately NOT one of them — it
 * is resolved by `useCreateEventoMutation`'s caller from the authenticated
 * session's own `sub` claim (self-service captain creation, the only
 * captain-assignment flow this branch implements — see this branch's
 * report for why no captain-picker exists: the pinned backend has no
 * endpoint to list other captains).
 *
 * `comanda_url` is NOT in this list either — the settled contract
 * (`docs/decisions.md` ADR-007) never declares a comanda field on
 * `EventoCrear` at all; it is uploaded afterward via a dedicated
 * `POST /eventos/{id}/comanda` from Event Detail
 * (`EventDetailComandaSection`), never as part of creation.
 *
 * `titulo`'s length rule is confirmed by `openapi-sgeb.yaml` v1.6.0
 * (`minLength: 3, maxLength: 120`), and independently re-confirmed against
 * the pinned backend's `crearEventoValidator`.
 *
 * Also includes three documented cross-field business rules, enforced
 * client-side as a first-pass check (the server remains authoritative):
 *
 * - SGEB-2007 — `fecha` must not be before today.
 * - SGEB-2008 — `inicio`'s date component must match `fecha`, and
 *   `inicio` must not be in the past. This form never asks for `inicio`'s
 *   date separately (see `hora_inicio` below) — its date component is
 *   `fecha` BY CONSTRUCTION, so only the "not in the past" half is a real
 *   cross-field check here; the "must match `fecha`" half of SGEB-2008 can
 *   no longer fail.
 * - SGEB-4007 — `num_mesas` must not exceed the selected salón's
 *   `capacidad_max_mesas`. This one needs the salón options list, so
 *   the schema is built by a factory rather than exported as a static
 *   constant.
 *
 * Field-name note: the schema's own keys stay snake_case
 * (`id_salon`, `hora_presentacion`, etc.) for RHF binding — a CONFIRMED
 * MISMATCH from the real, camelCase `POST /eventos` wire body
 * (`idSalon`, `horaPresentacion`, ...; see `eventsApi.ts`'s
 * `CreateEventoRequest` for the full writeup). `useCreateEventoMutation`'s
 * caller is responsible for translating between the two, the same
 * established pattern `closureApi.ts`'s `createMermaReport` already uses
 * for its own camelCase `costoEstimado` translation. The same caller also
 * derives the wire `inicio` datetime from `fecha` + `hora_inicio` via
 * `buildInicioDateTime` — this schema's own `hora_inicio` field is a UI
 * convenience, not a literal `EventoCrear` field name.
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
          (fecha) => fecha >= getTodayIsoDate(),
          'La fecha del evento no puede ser anterior a hoy.',
        ),
      hora_presentacion: z
        .string()
        .regex(HORA_PATTERN, 'Ingresa una hora válida (HH:MM).'),
      /**
       * The event's start TIME only — its date is always `fecha` above,
       * never asked twice (see `EventCreateForm`). Combined with `fecha`
       * into the real wire `inicio` datetime by `buildInicioDateTime`,
       * both here (for the "not in the past" check below) and in
       * `EventCreatePage`'s request builder.
       */
      hora_inicio: z
        .string()
        .regex(HORA_PATTERN, 'Ingresa una hora de inicio válida (HH:MM).'),
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
      const inicio = buildInicioDateTime(data.fecha, data.hora_inicio)
      if (!Number.isNaN(Date.parse(inicio)) && new Date(inicio) < new Date()) {
        ctx.addIssue({
          code: 'custom',
          path: ['hora_inicio'],
          message: 'La hora de inicio no puede ser anterior a este momento.',
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
 * The form's own validated value shape — NOT the `POST /eventos` request
 * body verbatim (see `createEventFormSchema`'s field-name note: keys stay
 * snake_case here, the real wire body is camelCase). `useCreateEventoMutation`'s
 * caller combines these values with the session-derived `uuidCapitan` to
 * build the real `CreateEventoRequest` (`eventsApi.ts`). Comanda is not
 * part of this payload at all — see `createEventFormSchema`'s comment.
 */
export type EventCreateFormValues = z.infer<ReturnType<typeof createEventFormSchema>>
