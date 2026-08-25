import { z } from 'zod'

/**
 * Mirrors the pinned backend's `crearValidator`
 * (`app/modules/identidad/controllers/invitaciones_controller.ts`)
 * field-for-field — same pattern/length limits
 * `features/waiters/schemas/invitationSchema.ts` documents for the mesero
 * invite form, duplicated locally rather than imported: the two forms
 * target different roles and are independent UI surfaces, same "small,
 * feature-local convention over a premature cross-feature abstraction"
 * `features/account/pages/ProfilePage.tsx`'s `ROLE_LABELS` comment
 * documents. Adds `idRolDestino`, which the mesero-only form never needs
 * (`WaitersPage` always resolves and supplies the `mesero` role id itself).
 */
const NOMBRE_MIN = 2
const NOMBRE_MAX = 30
const NOMBRE_PATTERN = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü' -]{2,30}$/
const CORREO_MAX = 100

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

export const staffInviteFormSchema = z.object({
  idRolDestino: z
    .number({ error: 'Selecciona un rol.' })
    .int()
    .min(1, 'Selecciona un rol.'),
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
})

export type StaffInviteFormValues = z.infer<typeof staffInviteFormSchema>
