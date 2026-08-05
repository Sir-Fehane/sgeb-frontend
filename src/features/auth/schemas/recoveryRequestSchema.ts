import { z } from 'zod'

import { EMAIL_PATTERN } from '@/features/auth/utils/patterns'

/**
 * Mirrors docs/sso/openapi-sso (1).yaml POST /auth/recuperacion. Length
 * bounds match the `correo` field's generic rule used consistently across
 * every SSO endpoint that takes it (e.g. /auth/login, /auth/invitaciones).
 */
export const recoveryRequestSchema = z.object({
  correo: z
    .string()
    .min(6, 'Ingresa tu correo.')
    .max(100, 'El correo es demasiado largo.')
    .regex(EMAIL_PATTERN, 'Ingresa un correo válido.'),
})

export type RecoveryRequestFormValues = z.infer<typeof recoveryRequestSchema>
