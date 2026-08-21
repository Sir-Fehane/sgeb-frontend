/**
 * Deterministic TanStack Query keys for the public diner screen's live
 * query. Namespaced under `publico` — distinct from every authenticated
 * `eventos`/`mesas` key elsewhere in the app, since this data comes from a
 * different, anonymous transport (`shared/api/publicClient.ts`) entirely.
 */
export const publicDinerQueryKeys = {
  all: ['publico', 'mesas'] as const,
  mesa: (codigoQr: string) => [...publicDinerQueryKeys.all, codigoQr] as const,
}
