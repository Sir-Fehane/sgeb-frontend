/** Deterministic TanStack Query keys for the Reports feature's own live queries. Distinct literal segments from every other feature reading a related endpoint, same convention as `closureQueryKeys.ts`. */
export const reportsQueryKeys = {
  all: ['reportes'] as const,
  mermaSummary: (idEvento: number) =>
    [...reportsQueryKeys.all, 'merma', idEvento] as const,
  ratings: (idEvento: number, soloBajas: boolean) =>
    [...reportsQueryKeys.all, 'calificaciones', idEvento, soloBajas] as const,
}
