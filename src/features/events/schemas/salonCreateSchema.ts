import { z } from 'zod'

const NOMBRE_MIN = 3
const NOMBRE_MAX = 80
const CALLE_MIN = 5
const CALLE_MAX = 50
const COLONIA_MIN = 2
const COLONIA_MAX = 40
const CIUDAD_MIN = 2
const CIUDAD_MAX = 40
const ESTADO_MIN = 2
const ESTADO_MAX = 25
const CAPACIDAD_MAX_MESAS_MAX = 255
const CAPACIDAD_PERSONAS_MAX = 65535

const CP_PATTERN = /^\d{5}$/

/**
 * Mirrors the pinned backend's `salonValidator`
 * (`app/modules/eventos/controllers/salones_controller.ts`) field-for-field
 * — this is the event-creation flow's minimal "no encuentro mi salón"
 * fallback, not a general Salon-catalog form (see `salonesApi.ts`'s own
 * comment for why only create + list exist in this branch).
 *
 * Field-name note: `estado` here is the address's Mexican state/province,
 * unrelated to `EVENTO.estado` (the lifecycle status). The form labels it
 * "Estado (dirección)" to avoid confusing the two; the schema key itself
 * must stay exactly `estado` since that is the real `POST /salones` wire
 * field name.
 */
export const createSalonFormSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(NOMBRE_MIN, `El nombre debe tener al menos ${String(NOMBRE_MIN)} caracteres.`)
    .max(NOMBRE_MAX, `El nombre no puede superar ${String(NOMBRE_MAX)} caracteres.`),
  calle: z
    .string()
    .trim()
    .min(CALLE_MIN, `La calle debe tener al menos ${String(CALLE_MIN)} caracteres.`)
    .max(CALLE_MAX, `La calle no puede superar ${String(CALLE_MAX)} caracteres.`),
  cp: z.string().trim().regex(CP_PATTERN, 'El código postal debe tener 5 dígitos.'),
  colonia: z
    .string()
    .trim()
    .min(COLONIA_MIN, `La colonia debe tener al menos ${String(COLONIA_MIN)} caracteres.`)
    .max(COLONIA_MAX, `La colonia no puede superar ${String(COLONIA_MAX)} caracteres.`),
  ciudad: z
    .string()
    .trim()
    .min(CIUDAD_MIN, `La ciudad debe tener al menos ${String(CIUDAD_MIN)} caracteres.`)
    .max(CIUDAD_MAX, `La ciudad no puede superar ${String(CIUDAD_MAX)} caracteres.`),
  estado: z
    .string()
    .trim()
    .min(ESTADO_MIN, `El estado debe tener al menos ${String(ESTADO_MIN)} caracteres.`)
    .max(ESTADO_MAX, `El estado no puede superar ${String(ESTADO_MAX)} caracteres.`),
  latitud: z
    .number({ error: 'Ingresa la latitud.' })
    .min(-90, 'La latitud debe estar entre -90 y 90.')
    .max(90, 'La latitud debe estar entre -90 y 90.'),
  longitud: z
    .number({ error: 'Ingresa la longitud.' })
    .min(-180, 'La longitud debe estar entre -180 y 180.')
    .max(180, 'La longitud debe estar entre -180 y 180.'),
  capacidadMaxMesas: z
    .number({ error: 'Ingresa la capacidad máxima de mesas.' })
    .int()
    .positive('La capacidad máxima de mesas debe ser mayor a 0.')
    .max(
      CAPACIDAD_MAX_MESAS_MAX,
      `La capacidad máxima de mesas no puede superar ${String(CAPACIDAD_MAX_MESAS_MAX)}.`,
    ),
  capacidadPersonas: z
    .number({ error: 'Ingresa la capacidad de personas.' })
    .int()
    .positive('La capacidad de personas debe ser mayor a 0.')
    .max(
      CAPACIDAD_PERSONAS_MAX,
      `La capacidad de personas no puede superar ${String(CAPACIDAD_PERSONAS_MAX)}.`,
    ),
})

export type CreateSalonFormValues = z.infer<typeof createSalonFormSchema>
