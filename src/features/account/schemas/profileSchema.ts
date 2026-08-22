import { z } from 'zod'

/** Mirrors the pinned backend's `actualizarUsuarioValidator` exactly (`app/modules/identidad/validators/usuario_validator.ts`) — same pattern/length limits, so a validation failure is caught client-side before it ever reaches `PUT /usuarios/me`. */
const NOMBRE_PATTERN = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü' -]{2,30}$/
const TELEFONO_PATTERN = /^\+?[0-9]{10,15}$/

/**
 * `apellidoMaterno`/`telefono` stay plain, always-string RHF fields (empty
 * string means "no value") rather than `z.string().nullable()` — the DOM
 * `<input>` this binds to can only ever hold a string. `ProfilePage`'s
 * submit handler is what translates an empty string to `null` for the real
 * `UpdateMiPerfilRequest`, the same "form stays string-shaped, the caller
 * translates" split `eventCreateSchema.ts` already documents for its own
 * fields.
 */
export const profileSchema = z.object({
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

export type ProfileFormValues = z.infer<typeof profileSchema>
