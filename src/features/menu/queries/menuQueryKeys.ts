/**
 * Deterministic TanStack Query keys for the global menu catalog. Namespaced
 * under `['menu', ...]`, never `['eventos', ...]` — this catalog is global,
 * not event-scoped (see `types/menu.ts`'s module comment).
 */
export const menuQueryKeys = {
  all: ['menu'] as const,
  insumos: () => [...menuQueryKeys.all, 'insumos'] as const,
  bebidas: () => [...menuQueryKeys.all, 'bebidas'] as const,
  envases: () => [...menuQueryKeys.all, 'envases'] as const,
}
