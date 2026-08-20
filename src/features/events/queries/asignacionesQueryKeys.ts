/** Deterministic TanStack Query keys for an event's real table assignments (`GET /eventos/{id}/asignaciones`). */
export const asignacionesQueryKeys = {
  all: ['asignaciones'] as const,
  list: (idEvento: number, vinculada?: boolean) =>
    [...asignacionesQueryKeys.all, 'lista', idEvento, vinculada ?? null] as const,
}
