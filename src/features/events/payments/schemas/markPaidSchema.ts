import { z } from 'zod'

const REFERENCIA_MIN = 1
const REFERENCIA_MAX = 40
const REFERENCIA_PATTERN = /^[A-Za-z0-9-]+$/

/**
 * `PATCH /pagos/{id_pago}/pagado`'s exact documented request body
 * validation. The API itself normalizes `referencia` to uppercase — this
 * schema mirrors that normalization client-side (via Zod's `.transform`)
 * so the local callback always receives the same normalized value the
 * real endpoint would echo back, matching the task's explicit
 * "accepts lowercase input but callback receives uppercase normalized
 * value" requirement.
 */
export const markPaidSchema = z.object({
  referencia: z
    .string()
    .min(REFERENCIA_MIN, 'Ingresa la referencia bancaria.')
    .max(
      REFERENCIA_MAX,
      `La referencia no puede superar ${String(REFERENCIA_MAX)} caracteres.`,
    )
    .regex(
      REFERENCIA_PATTERN,
      'Solo letras, números y guiones, sin espacios ni otros símbolos.',
    )
    .transform((value) => value.toUpperCase()),
})

export type MarkPaidFormValues = z.infer<typeof markPaidSchema>
