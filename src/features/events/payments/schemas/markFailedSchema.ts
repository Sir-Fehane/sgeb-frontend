import { z } from 'zod'

const MOTIVO_MIN = 3
const MOTIVO_MAX = 200

/** `PATCH /pagos/{id_pago}/fallido`'s exact documented request body validation. */
export const markFailedSchema = z.object({
  motivo: z
    .string()
    .min(MOTIVO_MIN, `Ingresa al menos ${String(MOTIVO_MIN)} caracteres.`)
    .max(MOTIVO_MAX, `El motivo no puede superar ${String(MOTIVO_MAX)} caracteres.`),
})

export type MarkFailedFormValues = z.infer<typeof markFailedSchema>
