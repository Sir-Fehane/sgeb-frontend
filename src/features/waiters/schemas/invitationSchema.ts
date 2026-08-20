import { z } from 'zod'

/**
 * Mirrors the pinned backend's `crearValidator`
 * (`app/modules/identidad/controllers/invitaciones_controller.ts`)
 * field-for-field. No `telefono` field: unlike the older W-04 wireframe
 * (phone-only), the real, live validator has no phone field at all —
 * intentionally not added here.
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
})

export type InvitationFormValues = z.infer<typeof invitationFormSchema>
