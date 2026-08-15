/**
 * Deterministic TanStack Query keys for the live Comanda metadata query.
 * `'comanda'` never collides with any other feature reading a related
 * endpoint — same reasoning as `closureQueryKeys.ts`/`paymentsQueryKeys.ts`.
 * Root stays `'eventos'`, not `'events'`, matching every other query-key
 * file in this feature.
 *
 * Deliberately holds NO signed URL, storage key, filename, or any other
 * sensitive/ephemeral value — only `idEvento`. The one-shot access data
 * (`ComandaAccess`) is never put in a TanStack Query key or cache at all;
 * see `queries/useOpenComandaMutation.ts`.
 */
export const comandaQueryKeys = {
  all: ['eventos', 'comanda'] as const,
  detail: (idEvento: number) => [...comandaQueryKeys.all, idEvento] as const,
}
