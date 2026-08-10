import type { WasteType } from '@/features/events/closure/types/closure'

/**
 * Safe Spanish labels for the five documented merma categories
 * (`POST /eventos/{id_evento}/reportes-merma`'s `detalles[].tipo` enum).
 * A display decision this feature owns, per
 * docs/FrontendArchitecture.md §11.
 */
export const WASTE_TYPE_LABELS: Record<WasteType, string> = {
  vaso_roto: 'Vaso roto',
  plato_roto: 'Plato roto',
  copa_rota: 'Copa rota',
  comida_desperdiciada: 'Comida desperdiciada',
  otro: 'Otro',
}
