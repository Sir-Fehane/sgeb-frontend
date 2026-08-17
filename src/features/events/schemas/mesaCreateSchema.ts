import { z } from 'zod'

const ETIQUETA_MAX = 20
const NFC_UID_PATTERN = /^[0-9A-Fa-f:]{4,50}$/

/**
 * Mirrors the pinned backend's `mesaValidator`
 * (`app/modules/eventos/validators/evento_validator.ts`) field-for-field —
 * the exact minimum needed for `POST /eventos/{id}/mesas`. `nfcUid` stays
 * an optional plain string here (empty means "not provided"); the schema
 * only validates its shape when the user actually types one.
 */
export const createMesaFormSchema = z.object({
  etiqueta: z
    .string()
    .trim()
    .min(1, 'Ingresa una etiqueta para la mesa.')
    .max(
      ETIQUETA_MAX,
      `La etiqueta no puede superar ${String(ETIQUETA_MAX)} caracteres.`,
    ),
  nfc_uid: z
    .string()
    .trim()
    .regex(
      NFC_UID_PATTERN,
      'El UID NFC debe ser hexadecimal (4-50 caracteres, puede usar ":")',
    )
    .or(z.literal('')),
})

export type CreateMesaFormValues = z.infer<typeof createMesaFormSchema>
