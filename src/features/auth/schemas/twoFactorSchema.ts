import { z } from 'zod'

import { VERIFICATION_CODE_PATTERN } from '@/features/auth/utils/patterns'

/**
 * Mirrors docs/sso/openapi-sso (1).yaml POST /auth/verificacion. Only
 * `codigo` and `confiar_dispositivo` are exposed in the web UI —
 * `nombre_dispositivo` has no basis in the S3 wireframe (only a phone
 * mockup exists) and `ticket_2fa` is internal flow data, never a form
 * field (see `TwoFactorForm`).
 */
export const twoFactorSchema = z.object({
  codigo: z
    .string()
    .regex(VERIFICATION_CODE_PATTERN, 'Ingresa los 6 dígitos del código.'),
  confiarDispositivo: z.boolean(),
})

export type TwoFactorFormValues = z.infer<typeof twoFactorSchema>
