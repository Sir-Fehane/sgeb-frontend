import { z } from 'zod'

/**
 * Mirrors the pinned backend's `crearValidator`
 * (`app/modules/identidad/controllers/invitaciones_controller.ts`)
 * field-for-field, including `telefono` — added to that validator in
 * `ba55bea` (`database/migrations/1800000016_invitacion_telefono.ts`):
 * `vine.string().trim().regex(/^\+?[0-9]{10,15}$/).nullable().optional()`.
 * Same pattern already used by `features/users/schemas/userEditSchema.ts`
 * and `features/account/schemas/profileSchema.ts` for the identical
 * backend regex, reused here rather than redefined ad hoc.
 */
const NOMBRE_MIN = 2
const NOMBRE_MAX = 30
const NOMBRE_PATTERN = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü' -]{2,30}$/
const CORREO_MAX = 100
const TELEFONO_PATTERN = /^\+?[0-9]{10,15}$/

const nombreField = (label: string) =>
  z
    .string()
    .trim()
    .min(NOMBRE_MIN, `${label} debe tener al menos ${String(NOMBRE_MIN)} caracteres.`)
    .max(NOMBRE_MAX, `${label} no puede superar ${String(NOMBRE_MAX)} caracteres.`)
    .regex(
      NOMBRE_PATTERN,
      `${label} solo puede contener letras, espacios, apóstrofes y guiones.`,
    )

export const invitationFormSchema = z.object({
  nombre: nombreField('El nombre'),
  apellidoPaterno: nombreField('El apellido paterno'),
  apellidoMaterno: z
    .union([nombreField('El apellido materno'), z.literal('')])
    .optional(),
  correo: z
    .string()
    .trim()
    .email('Ingresa un correo válido.')
    .max(CORREO_MAX, `El correo no puede superar ${String(CORREO_MAX)} caracteres.`),
  /**
   * Optional, same as the backend column: hay meseros que se invitan solo
   * por correo. Stays a plain, always-string RHF field — empty string means
   * "no value" — same "form stays string-shaped, the caller translates"
   * split `profileSchema.ts`/`userEditSchema.ts` already document.
   */
  telefono: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || TELEFONO_PATTERN.test(value),
      'Ingresa un teléfono válido (10 a 15 dígitos).',
    )
    .optional(),
})

export type InvitationFormValues = z.infer<typeof invitationFormSchema>
