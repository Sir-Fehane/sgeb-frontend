import type { ChecklistTipo } from '@/features/checklists/types/checklists'

/**
 * Deterministic TanStack Query keys for the global checklist template
 * catalog. Namespaced under `['checklists', ...]`, never `['eventos', ...]`
 * — this catalog is global, not event-scoped (see `types/checklists.ts`'s
 * module comment). Distinct from `montageQueryKeys.checklistTemplates()`,
 * which caches only the `montaje`-filtered subset for the Montage screen;
 * this key caches the unfiltered admin view, so the two intentionally do
 * not share a cache entry.
 *
 * `list(tipo)` — optional, so the admin catalog screen's own unfiltered
 * `list()` call keeps its original cache entry unchanged. `Control de
 * salida` (`features/events/live-operations`) passes `'cierre'` to get its
 * own distinct entry for the `tipo=cierre` subset, the same "one key per
 * server-side filter" convention `montageQueryKeys.checklistTemplates()`
 * already established for `tipo=montaje` — never sharing this feature's
 * unfiltered cache entry with a filtered one.
 */
export const checklistsQueryKeys = {
  all: ['checklists'] as const,
  list: (tipo?: ChecklistTipo) =>
    [...checklistsQueryKeys.all, 'list', tipo ?? 'all'] as const,
}
