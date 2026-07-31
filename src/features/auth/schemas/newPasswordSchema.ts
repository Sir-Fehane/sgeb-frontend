import { z } from 'zod'

import { PASSWORD_POLICY_PATTERN } from '@/features/auth/utils/patterns'

/**
 * Mirrors docs/sso/openapi-sso (1).yaml POST /auth/recuperacion/restablecer
 * and the data dictionary's TOKEN_RECUPERACION business rule (S6):
 * password policy (SSO-2006) plus confirmation match (SSO-2007).
 */
export const newPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Tu contraseña debe tener al menos 8 caracteres.')
      .max(72, 'La contraseña es demasiado larga.')
      .regex(PASSWORD_POLICY_PATTERN, 'La contraseña no cumple los requisitos.'),
    passwordConfirmacion: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirmacion, {
    message: 'Las contraseñas no coinciden.',
    path: ['passwordConfirmacion'],
  })

export type NewPasswordFormValues = z.infer<typeof newPasswordSchema>
