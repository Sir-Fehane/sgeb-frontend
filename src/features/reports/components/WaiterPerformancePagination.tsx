import { Button, Text } from '@/shared/components'

export interface WaiterPerformancePaginationProps {
  page: number
  lastPage: number
  total: number
  onPageChange: (page: number) => void
}

/**
 * The app's first real server-pagination control — no shared `Pagination`
 * primitive exists yet (confirmed: no other list in this codebase is
 * server-paginated, `PaginationParams` in `shared/types/api.ts` had no real
 * consumer before this report). Kept feature-local rather than promoted to
 * `shared/components`, per CLAUDE.md's "reuse before abstracting" — a
 * shared version can be extracted the next time a second endpoint actually
 * needs one.
 */
export function WaiterPerformancePagination({
  page,
  lastPage,
  total,
  onPageChange,
}: WaiterPerformancePaginationProps) {
  if (total === 0) {
    return null
  }

  return (
    <nav
      aria-label="Paginación de desempeño de meseros"
      className="flex flex-wrap items-center justify-between gap-3"
    >
      <Text size="sm" className="text-muted-foreground">
        Página {page} de {lastPage} · {total} mesero(s)
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
