import { z } from 'zod'

/** Field limits mirror `cubaitor_validator.ts`'s `configPinValidator`/`recargaValidator` on the pinned backend. */
export const createConfigDispensadoSchema = z.object({
  idCubaitor: z.number({ error: 'Selecciona un Cubaitor.' }).positive(),
  idInsumo: z.number({ error: 'Selecciona un insumo.' }).positive(),
  pinGpio: z
    .number({ error: 'Ingresa el pin GPIO.' })
    .int('El pin debe ser un número entero.')
    .min(0)
    .max(39),
  caudalMlSeg: z
    .number({ error: 'Ingresa el caudal calibrado.' })
    .min(0.01, 'El caudal debe ser mayor a 0.')
    .max(999.99),
  volumenCargadoMl: z
    .number({ error: 'Ingresa el volumen cargado.' })
    .int('El volumen debe ser un número entero.')
    .min(1)
    .max(65535),
})
export type CreateConfigDispensadoFormValues = z.infer<
  typeof createConfigDispensadoSchema
>

/** Recalibration only — see `services/eventCubaitorApi.ts`'s `updateConfigDispensado`. */
export const recalibrarConfigDispensadoSchema = z.object({
  caudalMlSeg: z.number().min(0.01).max(999.99),
})
export type RecalibrarConfigDispensadoFormValues = z.infer<
  typeof recalibrarConfigDispensadoSchema
>

export const recargaSchema = z.object({
  volumenCargadoMl: z
    .number({ error: 'Ingresa el volumen cargado.' })
    .int('El volumen debe ser un número entero.')
    .min(1)
    .max(65535),
})
export type RecargaFormValues = z.infer<typeof recargaSchema>

export const reportarManualSchema = z.object({
  segundosReal: z
    .number({ error: 'Ingresa los segundos reales.' })
    .min(0)
    .max(99.99)
    .nullable(),
})
export type ReportarManualFormValues = z.infer<typeof reportarManualSchema>
