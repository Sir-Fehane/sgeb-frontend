import { DashboardSection } from '@/features/dashboard/components/DashboardSection'
import { DashboardSectionUnavailable } from '@/features/dashboard/components/DashboardSectionUnavailable'
import type { CurrentOperationViewModel } from '@/features/dashboard/types/dashboard'
import { Text } from '@/shared/components'

export interface CurrentOperationSectionProps {
  operacion: CurrentOperationViewModel | null
}

const FIELDS: readonly {
  key: keyof Omit<CurrentOperationViewModel, 'idEvento' | 'titulo'>
  label: string
}[] = [
  { key: 'meserosEnPiso', label: 'Meseros en piso' },
  { key: 'mesasOcupadas', label: 'Mesas ocupadas' },
  { key: 'mesasTotal', label: 'Mesas totales' },
  { key: 'ordenesActivas', label: 'Órdenes activas' },
  { key: 'solicitudesPendientes', label: 'Solicitudes pendientes' },
]

/**
 * `DashboardCapitan.operacion` — `null` when unavailable, or an object
 * whose `titulo`/`idEvento` are both `null` when there is simply no
 * event in progress (a valid, distinct state from "unavailable"). No
 * link to a live-operation view: that route isn't approved yet.
 */
export function CurrentOperationSection({ operacion }: CurrentOperationSectionProps) {
  return (
    <DashboardSection title="Operación en curso">
      {operacion === null ? (
        <DashboardSectionUnavailable />
      ) : operacion.titulo === null ? (
        <Text size="sm" className="text-muted-foreground">
          No hay ningún evento en curso.
        </Text>
      ) : (
        <div className="flex flex-col gap-4">
          <Text className="font-semibold">{operacion.titulo}</Text>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {FIELDS.map(({ key, label }) => (
              <div key={key} className="flex flex-col gap-1">
                <dt className="font-sans text-caption text-muted-foreground">{label}</dt>
                <dd className="font-heading text-heading text-foreground font-semibold">
                  {operacion[key]}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </DashboardSection>
  )
}
