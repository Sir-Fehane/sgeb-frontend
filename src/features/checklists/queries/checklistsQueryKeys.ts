/**
 * Deterministic TanStack Query keys for the global checklist template
 * catalog. Namespaced under `['checklists', ...]`, never `['eventos', ...]`
 * — this catalog is global, not event-scoped (see `types/checklists.ts`'s
 * module comment). Distinct from `montageQueryKeys.checklistTemplates()`,
 * which caches only the `montaje`-filtered subset for the Montage screen;
 * this key caches the unfiltered admin view, so the two intentionally do
 * not share a cache entry.
 */
export const checklistsQueryKeys = {
  all: ['checklists'] as const,
  list: () => [...checklistsQueryKeys.all, 'list'] as const,
}
