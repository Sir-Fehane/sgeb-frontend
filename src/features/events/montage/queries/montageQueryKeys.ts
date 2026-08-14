/**
 * Deterministic TanStack Query keys for the Montage screen's live queries.
 * `checklistTemplates` is deliberately NOT event-scoped — `montaje`
 * templates are a global catalog, so one cache entry serves every event.
 */
export const montageQueryKeys = {
  all: ['eventos', 'montaje'] as const,
  participants: (idEvento: number) =>
    [...montageQueryKeys.all, 'participaciones', idEvento] as const,
  checklistTemplates: () => [...montageQueryKeys.all, 'checklists-montaje'] as const,
  checklistInstancias: (idParticipacion: number) =>
    [...montageQueryKeys.all, 'checklist-instancias', idParticipacion] as const,
}
