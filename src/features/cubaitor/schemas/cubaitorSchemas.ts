import { z } from 'zod'

/** Mirrors `features/menu/schemas/menuSchemas.ts`'s style — field limits are a reasonable, documented client-side floor; the server remains the source of truth for any limit not confirmed here. */
const MAC_PATTERN = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/
const IPV4_PATTERN =
  /^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/

export const CUBAITOR_ESTADOS = ['activo', 'inactivo', 'mantenimiento'] as const

/**
 * `mac` only appears here — it is the device's physical identity, immutable
 * once registered (see `services/cubaitorApi.ts`'s `updateCubaitor`
 * comment), so `updateCubaitorSchema` below omits it entirely rather than
 * making it optional-but-ignored.
 */
export const createCubaitorSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, 'Ingresa al menos 2 caracteres.')
    .max(40, 'No puede superar 40 caracteres.'),
  mac: z
    .string()
    .trim()
    .regex(MAC_PATTERN, 'Ingresa una MAC válida, p. ej. A4:CF:12:9B:3E:01.'),
  numPins: z
    .number({ error: 'Ingresa el número de pines.' })
    .int('El número de pines debe ser un entero.')
    .min(1, 'Debe tener al menos 1 pin.')
    .max(16, 'No puede tener más de 16 pines.'),
  /**
   * `.nullable()` only, deliberately not also `.optional()`: the form
   * always supplies a value (`null` when left blank, via `setValueAs` —
   * see `CubaitorFleetSection.tsx`'s `parseOptionalHostIp`), so the
   * inferred type stays `string | null` with no `| undefined` in the
   * value position. That keeps it assignable to `CreateCubaitorInput`'s
   * `hostIp?: string | null` under `exactOptionalPropertyTypes` — an
   * always-present key is a valid subset of an optional one, whereas a
   * value typed to explicitly allow `undefined` is not.
   */
  hostIp: z
    .string()
    .trim()
    .regex(IPV4_PATTERN, 'Ingresa una IP válida, p. ej. 192.168.1.20.')
    .nullable(),
})
export type CreateCubaitorFormValues = z.infer<typeof createCubaitorSchema>

export const updateCubaitorSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, 'Ingresa al menos 2 caracteres.')
    .max(40, 'No puede superar 40 caracteres.')
    .optional(),
  numPins: z
    .number({ error: 'Ingresa el número de pines.' })
    .int('El número de pines debe ser un entero.')
    .min(1, 'Debe tener al menos 1 pin.')
    .max(16, 'No puede tener más de 16 pines.')
    .optional(),
  hostIp: z
    .string()
    .trim()
    .regex(IPV4_PATTERN, 'Ingresa una IP válida, p. ej. 192.168.1.20.')
    .nullable()
    .optional(),
  estado: z.enum(CUBAITOR_ESTADOS, { error: 'Selecciona un estado.' }).optional(),
})
export type UpdateCubaitorFormValues = z.infer<typeof updateCubaitorSchema>
