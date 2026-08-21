import { IconArrowLeft } from '@tabler/icons-react'
import { Link } from 'react-router-dom'

import { EventDetailUnavailableState } from '@/features/events/components/EventDetailUnavailableState'
import { EventServiceRequestsErrorState } from '@/features/events/service-requests/components/EventServiceRequestsErrorState'
import { EventServiceRequestsFilters } from '@/features/events/service-requests/components/EventServiceRequestsFilters'
import { EventServiceRequestsList } from '@/features/events/service-requests/components/EventServiceRequestsList'
import { EventServiceRequestsLoadingState } from '@/features/events/service-requests/components/EventServiceRequestsLoadingState'
import type {
  ServiceRequestStatusFilter,
  ServiceRequestViewModel,
} from '@/features/events/service-requests/types/serviceRequest'
import { Alert, Button, SectionHeading, Text } from '@/shared/components'

export interface EventServiceRequestsContentProps {
  idEvento: number | null
  requests: readonly ServiceRequestViewModel[] | null
  estado: ServiceRequestStatusFilter
  onEstadoChange: (estado: ServiceRequestStatusFilter) => void
  isLoading: boolean
  errorMessage?: string | undefined
  onRetry: () => void
  onAttend: (idSolicitud: number) => void
  onCancel: (idSolicitud: number) => void
  pendingIdSolicitud: number | null
  actionErrorMessage?: string | undefined
}

export function EventServiceRequestsContent({
  idEvento,
  requests,
  estado,
  onEstadoChange,
  isLoading,
  errorMessage,
  onRetry,
  onAttend,
  onCancel,
  pendingIdSolicitud,
  actionErrorMessage,
}: EventServiceRequestsContentProps) {
  if (idEvento === null) {
    return <EventDetailUnavailableState />
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link to={`/eventos/${String(idEvento)}`}>
            <IconArrowLeft aria-hidden="true" />
            Volver al evento
          </Link>
        </Button>

        <div className="flex flex-col gap-1">
          {/* `<h2>`, not `<h1>` — `AppShell`'s `Topbar` already renders the page's one `<h1>` ("Eventos"), same convention `EventClosureHeader` establishes. */}
          <SectionHeading className="text-heading">Solicitudes de mesa</SectionHeading>
          <Text size="sm" className="text-muted-foreground">
            Peticiones de atención y cuenta enviadas desde las mesas de este evento.
          </Text>
        </div>
      </div>

      {isLoading ? (
        <EventServiceRequestsLoadingState />
      ) : errorMessage ? (
        <EventServiceRequestsErrorState errorMessage={errorMessage} onRetry={onRetry} />
      ) : (
        <>
          <EventServiceRequestsFilters estado={estado} onEstadoChange={onEstadoChange} />

          {actionErrorMessage ? (
            <Alert tone="danger" title="No se pudo actualizar la solicitud">
              <p>{actionErrorMessage}</p>
            </Alert>
          ) : null}

          <EventServiceRequestsList
            requests={requests ?? []}
            onAttend={onAttend}
            onCancel={onCancel}
            pendingIdSolicitud={pendingIdSolicitud}
          />
        </>
      )}
    </div>
  )
}
