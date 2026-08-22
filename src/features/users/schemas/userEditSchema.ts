import { z } from 'zod'

/**
 * Mirrors the pinned backend's `actualizarUsuarioValidator`
 * (`app/modules/identidad/validators/usuario_validator.ts`) — the exact same
 * validator `PUT /usuarios/me` uses, since `PUT /usuarios/{uuid}` (admin
 * editing another user) accepts the identical field set. Same
 * pattern/length limits as `features/account/schemas/profileSchema.ts`,
 * duplicated locally rather than imported — that schema is scoped to
 * self-editing copy/behavior (`ProfileForm`), this one to admin-editing
 * another account (`UserEditForm`); keeping them independent means a future
 * change to one (e.g. a confirmation step only admin-editing should have)
 * never silently touches the other.
 */
const NOMBRE_PATTERN = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü' -]{2,30}$/
const TELEFONO_PATTERN = /^\+?[0-9]{10,15}$/

/**
 * `apellidoMaterno`/`telefono` stay plain, always-string RHF fields (empty
 * string means "no value") — the caller translates to `null` for the real
 * `UpdateUserRequest`, same "form stays string-shaped" split
 * `profileSchema.ts` documents.
 */
export const userEditSchema = z.object({
  nombre: z.string().trim().regex(NOMBRE_PATTERN, 'Usa entre 2 y 30 letras.'),
  apellidoPaterno: z.string().trim().regex(NOMBRE_PATTERN, 'Usa entre 2 y 30 letras.'),
  apellidoMaterno: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || NOMBRE_PATTERN.test(value),
      'Usa entre 2 y 30 letras.',
    ),
  telefono: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || TELEFONO_PATTERN.test(value),
      'Ingresa un teléfono válido (10 a 15 dígitos).',
    ),
})

export type UserEditFormValues = z.infer<typeof userEditSchema>
