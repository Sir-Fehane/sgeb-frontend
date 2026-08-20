import { z } from 'zod'

const ETIQUETA_MAX = 20

/**
 * Mirrors the pinned backend's `mesaValidator`
 * (`app/modules/eventos/validators/evento_validator.ts`) field-for-field —
 * the exact minimum needed for `POST /eventos/{id}/mesas`.
 *
 * No `nfc_uid` field: the backend still accepts/returns it (`Mesa.nfc_uid`
 * is a real, reserved column — see `mesasApi.ts`'s `MesaApiRecord`), but
 * `openapi-sgeb.yaml` v1.12.0 documents it as unused by any real flow —
 * linking is done by QR — so this normal-workflow creation form no longer
 * exposes it as something a captain/admin would fill in.
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
})

export type CreateMesaFormValues = z.infer<typeof createMesaFormSchema>
