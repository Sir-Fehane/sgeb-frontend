import { z } from 'zod'

const CANTIDAD_MIN = 1
const CANTIDAD_MAX = 65535
const DESCRIPCION_MAX = 150
const OBSERVACIONES_MAX = 255
const COSTO_ESTIMADO_MIN = 0
const COSTO_ESTIMADO_MAX = 999999.99

/**
 * `POST /eventos/{id_evento}/reportes-merma`'s documented request body
 * enum — exactly these five values, matching `types/closure.ts`'s
 * `WasteType`. Do not add a category the endpoint doesn't document.
 */
export const WASTE_TYPES = [
  'vaso_roto',
  'plato_roto',
  'copa_rota',
  'comida_desperdiciada',
  'otro',
] as const

/**
 * Mirrors `POST /eventos/{id_evento}/reportes-merma`'s documented request
 * body field-for-field, using the documented snake_case names — the same
 * established convention as `eventCreateSchema.ts` for the RHF-bound form
 * values.
 *
 * CONFIRMED MISMATCH (direct inspection of the pinned backend,
 * `app/modules/cierre/validators/cierre_validator.ts` and
 * `tests/unit/cierre.spec.ts`): the real request body requires camelCase
 * `costoEstimado`, not the `costo_estimado` `openapi-sgeb.yaml` documents.
 * This schema's field stays `costo_estimado` — matching this form's own
 * labels/RHF registration and every other domain type in this feature —
 * and `services/closureApi.ts`'s `createMermaReport` is responsible for
 * translating it to the real wire key before the request is sent, exactly
 * like `mapEventoToListItem`/`mapEventoToDetail` already own view-model
 * ↔ wire translation elsewhere. Do not send this schema's keys directly
 * as a request body.
 *
 * `costo_estimado` and `descripcion` are registered with RHF's
 * `setValueAs` (see `EventClosureWasteForm.tsx`) so an empty input
 * normalizes to `null` rather than an accidental empty string or `NaN` —
 * matching the documented `nullable: true` on both fields.
 */
const wasteDetailSchema = z.object({
  tipo: z.enum(WASTE_TYPES, { error: 'Selecciona un tipo de artículo.' }),
  descripcion: z
    .string()
    .max(
      DESCRIPCION_MAX,
      `La descripción no puede superar ${String(DESCRIPCION_MAX)} caracteres.`,
    )
    .nullable(),
  cantidad: z
    .number({ error: 'Ingresa la cantidad.' })
    .int('La cantidad debe ser un número entero.')
    .min(CANTIDAD_MIN, `La cantidad debe ser al menos ${String(CANTIDAD_MIN)}.`)
    .max(CANTIDAD_MAX, `La cantidad no puede superar ${String(CANTIDAD_MAX)}.`),
  costo_estimado: z
    .number()
    .min(COSTO_ESTIMADO_MIN, 'El costo estimado no puede ser negativo.')
    .max(
      COSTO_ESTIMADO_MAX,
      `El costo estimado no puede superar $${String(COSTO_ESTIMADO_MAX)}.`,
    )
    .nullable(),
})

export const createWasteReportSchema = z.object({
  observaciones: z
    .string()
    .max(
      OBSERVACIONES_MAX,
      `Las observaciones no pueden superar ${String(OBSERVACIONES_MAX)} caracteres.`,
    )
    .nullable(),
  detalles: z.array(wasteDetailSchema).min(1, 'Agrega al menos un artículo.'),
})

/**
 * Form-bound value shape (RHF `useForm`/`useFieldArray`), NOT a claimed
 * `CreateWasteReportRequest`/`ReporteMermaCrear` type name — the field
 * names are already the exact documented wire shape (see the schema's own
 * comment), so no further mapping layer is needed before this could be
 * sent as a real `POST /eventos/{id_evento}/reportes-merma` body, unlike
 * `EventCreateFormValues` which is deliberately incomplete (it omits the
 * session-derived `uuid_capitan` — see that schema's own comment).
 */
export type CreateWasteReportFormValues = z.infer<typeof createWasteReportSchema>
