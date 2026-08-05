import { z } from 'zod'

import { EMAIL_PATTERN } from '@/features/auth/utils/patterns'

/**
 * Mirrors docs/sso/openapi-sso (1).yaml POST /auth/login exactly. The
 * login endpoint enforces only length bounds on `password` (8-72) — the
 * uppercase/digit/symbol complexity rule (SSO-2006) is only checked at
 * registro/restablecer, not at login (see the SSO error dictionary §4 and
 * `newPasswordSchema.ts`). Do not add that complexity check here.
 *
 * S1's wireframe also shows a "Recordar este equipo" checkbox. It is
 * deliberately NOT a field here: `/auth/login`'s request body has no
 * matching boolean — it only accepts `token_dispositivo`, a *previously
 * issued* trusted-device token that an integration layer would attach
 * automatically, never one a user types or toggles. Device trust is
 * actually requested via `confiar_dispositivo` at `POST
 * /auth/verificacion` (S3) — see `twoFactorSchema.ts`. Rendering an
 * interactive checkbox here with no real request mapping would falsely
 * imply the user's choice does something, so it is omitted until the
 * login contract defines a matching field.
 */
export const loginSchema = z.object({
  correo: z
    .string()
    .min(6, 'Ingresa tu correo.')
    .max(100, 'El correo es demasiado largo.')
    .regex(EMAIL_PATTERN, 'Ingresa un correo válido.'),
  password: z
    .string()
    .min(8, 'Tu contraseña debe tener al menos 8 caracteres.')
    .max(72, 'La contraseña es demasiado larga.'),
})

export type LoginFormValues = z.infer<typeof loginSchema>
