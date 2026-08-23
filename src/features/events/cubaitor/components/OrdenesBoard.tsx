import type {
  OrdenEstado,
  OrdenViewModel,
} from '@/features/events/cubaitor/types/eventCubaitor'
import { OrdenCard } from '@/features/events/cubaitor/components/OrdenCard'
import { Alert, Button, Select, Skeleton, Text } from '@/shared/components'

const ESTADO_FILTROS: { value: OrdenEstado | ''; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'en_preparacion', label: 'En preparación' },
  { value: 'dispensando', label: 'Dispensando' },
  { value: 'pausada_por_insumo', label: 'Pausadas' },
  { value: 'entregada', label: 'Entregadas' },
  { value: 'cancelada', label: 'Canceladas' },
]

export interface OrdenesBoardProps {
  ordenes: readonly OrdenViewModel[] | undefined
  isLoading: boolean
  errorMessage: string | undefined
  onRetry: () => void
  filtroEstado: OrdenEstado | ''
  onChangeFiltro: (estado: OrdenEstado | '') => void
  bebidasById: ReadonlyMap<number, string>
  envasesById: ReadonlyMap<number, string>
  ordenActionStatus: Record<number, 'updating' | 'error'>
  ordenActionError: Record<number, string>
  onCambiarEstado: (idOrden: number, estado: OrdenEstado) => void
  dispensarStatus: Record<number, boolean>
  dispensarError: Record<number, string>
  onDispensar: (idDetalle: number) => void
  configPinById: ReadonlyMap<number, number>
  reportarStatus: Record<number, boolean>
  reportarError: Record<number, string>
  onReportar: (idDispensado: number, segundosReal: number | null) => void
}

/** The live "tablero de barra" — `GET /eventos/{id}/ordenes`. */
export function OrdenesBoard({
  ordenes,
  isLoading,
  errorMessage,
  onRetry,
  filtroEstado,
  onChangeFiltro,
  bebidasById,
  envasesById,
  ordenActionStatus,
  ordenActionError,
  onCambiarEstado,
  dispensarStatus,
  dispensarError,
  onDispensar,
  configPinById,
  reportarStatus,
  reportarError,
  onReportar,
}: OrdenesBoardProps) {
  return (
    <div className="flex flex-col gap-4">
      <FormFieldFilter value={filtroEstado} onChange={onChangeFiltro} />

      {isLoading ? (
        <div role="status" aria-label="Cargando órdenes" className="flex flex-col gap-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-32 w-full" />
          ))}
        </div>
      ) : errorMessage ? (
        <Alert tone="danger" title="No pudimos cargar las órdenes">
          <p>{errorMessage}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-2 self-start"
            onClick={onRetry}
          >
            Reintentar
          </Button>
        </Alert>
      ) : !ordenes || ordenes.length === 0 ? (
        <div className="border-border rounded-lg border border-dashed p-10 text-center">
          <Text size="sm" className="text-muted-foreground">
            No hay órdenes {filtroEstado ? 'con ese estado' : 'todavía'} en este evento.
          </Text>
        </div>
      ) : (
        <ul aria-label="Órdenes" className="flex flex-col gap-3">
          {ordenes.map((orden) => (
            <li key={orden.idOrden}>
              <OrdenCard
                orden={orden}
                bebidasById={bebidasById}
                envasesById={envasesById}
                actionStatus={ordenActionStatus[orden.idOrden]}
                actionError={ordenActionError[orden.idOrden]}
                onCambiarEstado={(estado) => onCambiarEstado(orden.idOrden, estado)}
                dispensarStatus={dispensarStatus}
                dispensarError={dispensarError}
                onDispensar={onDispensar}
                configPinById={configPinById}
                reportarStatus={reportarStatus}
                reportarError={reportarError}
                onReportar={onReportar}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function FormFieldFilter({
  value,
  onChange,
}: {
  value: OrdenEstado | ''
  onChange: (estado: OrdenEstado | '') => void
}) {
  return (
    <Select
      aria-label="Filtrar órdenes por estado"
      value={value}
      onChange={(event) => onChange(event.target.value as OrdenEstado | '')}
      className="w-auto"
    >
      {ESTADO_FILTROS.map((filtro) => (
        <option key={filtro.value} value={filtro.value}>
          {filtro.label}
        </option>
      ))}
    </Select>
  )
}
