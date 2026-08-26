import { z } from 'zod'

/** Field limits mirror `checklist_validator.ts` on the pinned backend (`vine.string().minLength/maxLength`, `vine.number().min/max`). */
export const CHECKLIST_TIPOS = ['montaje', 'servicio', 'cierre'] as const

export const checklistItemSchema = z.object({
  descripcion: z.string().trim().min(3, 'Ingresa al menos 3 caracteres.').max(80),
  cantidadEsperada: z
    .number({ error: 'Ingresa la cantidad esperada.' })
    .int('Debe ser un número entero.')
    .min(1)
    .max(255),
  orden: z
    .number({ error: 'Ingresa el orden.' })
    .int('Debe ser un número entero.')
    .min(1)
    .max(255),
})

export const createChecklistSchema = z.object({
  nombre: z.string().trim().min(3, 'Ingresa al menos 3 caracteres.').max(40),
  tipo: z.enum(CHECKLIST_TIPOS, { error: 'Selecciona un tipo.' }),
  items: z.array(checklistItemSchema).min(1, 'Agrega al menos un ítem.'),
})
export type CreateChecklistFormValues = z.infer<typeof createChecklistSchema>
