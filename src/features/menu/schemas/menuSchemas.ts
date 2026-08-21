import { z } from 'zod'

/** Field limits mirror `menu_validator.ts` on the pinned backend (`vine.string().minLength/maxLength`, `vine.number().min/max`). */
export const INSUMO_TIPOS = ['alcohol', 'refresco', 'jugo', 'agua', 'otro'] as const

export const createInsumoSchema = z.object({
  nombre: z.string().trim().min(2, 'Ingresa al menos 2 caracteres.').max(30),
  tipo: z.enum(INSUMO_TIPOS, { error: 'Selecciona un tipo.' }),
  unidad: z.string().trim().min(1, 'Ingresa la unidad.').max(10),
  costo: z
    .number({ error: 'Ingresa el costo.' })
    .min(0, 'El costo no puede ser negativo.')
    .max(99999.99),
})
export type CreateInsumoFormValues = z.infer<typeof createInsumoSchema>

export const createBebidaSchema = z.object({
  nombre: z.string().trim().min(2, 'Ingresa al menos 2 caracteres.').max(30),
  descripcion: z.string().trim().max(70).nullable(),
  alcoholica: z.boolean(),
})
export type CreateBebidaFormValues = z.infer<typeof createBebidaSchema>

export const createEnvaseSchema = z.object({
  nombre: z.string().trim().min(2, 'Ingresa al menos 2 caracteres.').max(50),
  volumenMl: z
    .number({ error: 'Ingresa el volumen.' })
    .int('El volumen debe ser un número entero.')
    .min(1)
    .max(65535),
})
export type CreateEnvaseFormValues = z.infer<typeof createEnvaseSchema>

/** One recipe row. `PROPORCION` values across a recipe must sum to ≤ 1.00 — enforced server-side (`SGEB-2012`); this schema validates only the per-row shape, matching `EventClosureWasteForm`'s established division of labor between row-level Zod validation and server-enforced cross-row business rules. */
export const recetaIngredienteSchema = z.object({
  idInsumo: z.number({ error: 'Selecciona un insumo.' }).positive(),
  tipoPorcion: z.enum(['PROPORCION', 'FIJO_ML', 'RESTO'], {
    error: 'Selecciona un tipo de porción.',
  }),
  valor: z.number().min(0).max(999.99),
  ordenServido: z.number().int().min(1).max(255),
})

export const definirRecetaSchema = z.object({
  ingredientes: z
    .array(recetaIngredienteSchema)
    .min(1, 'Agrega al menos un ingrediente.'),
})
export type DefinirRecetaFormValues = z.infer<typeof definirRecetaSchema>
