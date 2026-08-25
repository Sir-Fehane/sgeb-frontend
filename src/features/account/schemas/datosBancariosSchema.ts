import { z } from 'zod'

/**
 * Mirrors the pinned backend's `datosBancariosValidator`
 * (`app/modules/identidad/validators/usuario_validator.ts`) field-for-field.
 * `clabe` here only checks the 18-digit shape the validator itself checks —
 * the control-digit check (`UsuarioService.clabeValida`, `SGEB-2005`) is
 * server-only and never duplicated client-side, same "reasonable,
 * documented floor; server remains the source of truth" convention
 * `features/cubaitor/schemas/cubaitorSchemas.ts` documents.
 */
const CLABE_PATTERN = /^\d{18}$/

export const datosBancariosSchema = z.object({
  clabe: z
    .string()
    .trim()
    .regex(CLABE_PATTERN, 'La CLABE debe tener exactamente 18 dígitos.'),
  banco: z
    .string()
    .trim()
    .min(2, 'Ingresa al menos 2 caracteres.')
    .max(30, 'No puede superar 30 caracteres.'),
  titularCuenta: z
    .string()
    .trim()
    .min(3, 'Ingresa al menos 3 caracteres.')
    .max(50, 'No puede superar 50 caracteres.'),
})

export type DatosBancariosFormValues = z.infer<typeof datosBancariosSchema>
