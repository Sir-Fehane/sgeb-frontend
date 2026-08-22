import { Button, Text } from '@/shared/components'

export interface AuditLogPaginationProps {
  page: number
  lastPage: number
  total: number
  onPageChange: (page: number) => void
}

/**
 * Same real server-pagination pattern `WaiterPerformancePagination`
 * establishes for `reportes/desempeno-meseros` — this is now the second
 * endpoint that comment anticipated, but kept as its own small, feature-local
 * copy rather than a shared extraction: the two labels ("mesero(s)" vs.
 * "movimiento(s)") are the only difference, and this codebase's established
 * convention favors small per-feature duplication over a premature shared
 * primitive (see e.g. `UsuarioApiRecord`/`ROLE_LABELS`, each independently
 * duplicated across `waiters`/`account`/this feature).
 */
export function AuditLogPagination({
  page,
  lastPage,
  total,
  onPageChange,
}: AuditLogPaginationProps) {
  if (total === 0) {
    return null
  }

  return (
    <nav
      aria-label="Paginación de bitácora"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <Text size="sm" className="text-muted-foreground">
        Página {page} de {lastPage} · {total} movimiento(s)
      </Text>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => {
            onPageChange(page - 1)
          }}
        >
          Anterior
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= lastPage}
          onClick={() => {
            onPageChange(page + 1)
          }}
        >
          Siguiente
        </Button>
      </div>
    </nav>
  )
}
