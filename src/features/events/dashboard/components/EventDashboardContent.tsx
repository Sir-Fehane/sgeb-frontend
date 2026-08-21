import { IconInfoCircle } from '@tabler/icons-react'

import { EventDetailUnavailableState } from '@/features/events/components/EventDetailUnavailableState'
import { EventDashboardErrorState } from '@/features/events/dashboard/components/EventDashboardErrorState'
import { EventDashboardHeader } from '@/features/events/dashboard/components/EventDashboardHeader'
import { EventDashboardLoadingState } from '@/features/events/dashboard/components/EventDashboardLoadingState'
import {
  EventDashboardAlertasSection,
  EventDashboardAsistenciaSection,
  EventDashboardBarraSection,
  EventDashboardMontajeSection,
  EventDashboardPisoSection,
  EventDashboardResumenSection,
  EventDashboardServicioSection,
} from '@/features/events/dashboard/components/EventDashboardSections'
import type { EventDashboardViewModel } from '@/features/events/dashboard/types/dashboard'
import { Alert, Text } from '@/shared/components'

export interface EventDashboardContentProps {
  idEvento: number
  dashboard: EventDashboardViewModel | null
  isLoading: boolean
  errorMessage?: string | undefined
  onRetry: () => void
}

export function EventDashboardContent({
  idEvento,
  dashboard,
  isLoading,
  errorMessage,
  onRetry,
}: EventDashboardContentProps) {
  if (isLoading) {
    return <EventDashboardLoadingState />
  }

  if (errorMessage) {
    return <EventDashboardErrorState errorMessage={errorMessage} onRetry={onRetry} />
  }

  if (!dashboard) {
    return <EventDetailUnavailableState />
  }

  return (
    <div className="flex flex-col gap-6">
      <EventDashboardHeader dashboard={dashboard} />

      {dashboard.partial ? (
        <Alert
          tone="warning"
          icon={<IconInfoCircle aria-hidden="true" />}
          title="Datos parciales"
        >
          <Text size="sm">
            Mostramos la información disponible; algunas secciones no pudieron calcularse
            en este momento.
          </Text>
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <EventDashboardResumenSection idEvento={idEvento} resumen={dashboard.resumen} />
        <EventDashboardAsistenciaSection
          idEvento={idEvento}
          asistencia={dashboard.asistencia}
        />
        <EventDashboardMontajeSection idEvento={idEvento} montaje={dashboard.montaje} />
        <EventDashboardPisoSection idEvento={idEvento} piso={dashboard.piso} />
        <EventDashboardBarraSection idEvento={idEvento} barra={dashboard.barra} />
        <EventDashboardServicioSection
          idEvento={idEvento}
          servicio={dashboard.servicio}
        />
        <EventDashboardAlertasSection idEvento={idEvento} alertas={dashboard.alertas} />
      </div>
    </div>
  )
}
