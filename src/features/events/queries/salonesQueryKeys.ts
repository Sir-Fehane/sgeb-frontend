import type { SalonesListParams } from '@/features/events/services/salonesApi'

/**
 * Deterministic TanStack Query keys for the salones prerequisite (event
 * creation's salón picker + its "crear salón" fallback, and Event Detail's
 * own single-salón resolution — this feature does not own a general Salon
 * catalog, see `salonesApi.ts`'s own comment).
 */
export const salonesQueryKeys = {
  all: ['salones'] as const,
  lists: () => [...salonesQueryKeys.all, 'lista'] as const,
  list: (params: SalonesListParams) => [...salonesQueryKeys.lists(), params] as const,
  details: () => [...salonesQueryKeys.all, 'detalle'] as const,
  detail: (idSalon: number) => [...salonesQueryKeys.details(), idSalon] as const,
}
