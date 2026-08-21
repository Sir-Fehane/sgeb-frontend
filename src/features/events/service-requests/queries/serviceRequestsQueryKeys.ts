import type { ServiceRequestStatusFilter } from '@/features/events/service-requests/types/serviceRequest'

/** Deterministic TanStack Query keys for the service-requests screen. Distinct literal segments from every other feature reading a related endpoint, same convention as `closureQueryKeys.ts`/`montageQueryKeys.ts`. */
export const serviceRequestsQueryKeys = {
  all: ['eventos', 'solicitudes'] as const,
  list: (idEvento: number, estado: ServiceRequestStatusFilter) =>
    [...serviceRequestsQueryKeys.all, 'list', idEvento, estado] as const,
}
