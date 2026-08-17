/** Deterministic TanStack Query keys for an event's real mesas (minimal list + create only — see `mesasApi.ts`'s own comment). */
export const mesasQueryKeys = {
  all: ['mesas'] as const,
  list: (idEvento: number) => [...mesasQueryKeys.all, 'lista', idEvento] as const,
}
