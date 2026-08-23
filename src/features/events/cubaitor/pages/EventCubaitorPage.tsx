import { IconArrowLeft } from '@tabler/icons-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { EventDetailSection } from '@/features/events/components/EventDetailSection'
import { EventDetailUnavailableState } from '@/features/events/components/EventDetailUnavailableState'
import { ConfigDispensadoSection } from '@/features/events/cubaitor/components/ConfigDispensadoSection'
import { EventCubaitorAlertasBanner } from '@/features/events/cubaitor/components/EventCubaitorAlertasBanner'
import { OrdenesBoard } from '@/features/events/cubaitor/components/OrdenesBoard'
import { useAlertasEventoQuery } from '@/features/events/cubaitor/queries/useAlertasEventoQuery'
import { useConfigDispensadoQuery } from '@/features/events/cubaitor/queries/useConfigDispensadoQuery'
import { useOrdenesEventoQuery } from '@/features/events/cubaitor/queries/useOrdenesEventoQuery'
import {
  useCambiarEstadoOrdenMutation,
  useDispensarMutation,
  useReportarDispensadoMutation,
} from '@/features/events/cubaitor/queries/useOrdenMutations'
import type { OrdenEstado } from '@/features/events/cubaitor/types/eventCubaitor'
import { useEventDetailQuery } from '@/features/events/queries/useEventDetailQuery'
import { isEventoNotFoundError } from '@/features/events/services/eventsApi'
import { parseEventId } from '@/features/events/utils/parseEventId'
import { useBebidasQuery } from '@/features/menu/queries/useBebidasQuery'
import { useEnvasesQuery } from '@/features/menu/queries/useEnvasesQuery'
import { isSgebApplicationError, isSgebNetworkError } from '@/shared/api/sgebApiError'
import { useEventRealtimeRoom } from '@/shared/realtime/useEventRealtimeRoom'
import { Alert, Button, Caption, SectionHeading, Tabs, Text } from '@/shared/components'

function toSafeErrorMessage(error: unknown): string {
  if (isSgebApplicationError(error) || isSgebNetworkError(error)) {
    return error.message
  }
  return 'Ocurrió un error inesperado al cargar la barra.'
}

const TABS = [
  { value: 'ordenes', label: 'Órdenes' },
  { value: 'configuracion', label: 'Configuración' },
] as const

/**
 * Routed at `/eventos/:id/cubaitor` (the slug `docs/FrontendArchitecture.md`
 * §17 already reserved as "still Proposed" for W-08 — this branch fills it
 * in for real). Monitor + intervene, never create: `POST /mesas/{id}/ordenes`
 * is mesero-only (see `types/eventCubaitor.ts`'s module comment) — this
 * screen is the captain/admin "tablero de barra," not an order form.
 *
 * The event dashboard's `barra` section (`/eventos/:id/panel-operativo`,
 * user-facing label "Resumen operativo") stays the summary surface; this
 * page is its detailed deep-link target — reused via the "Ver resumen
 * operativo" link below, never a second copy of those counts.
 */
export function EventCubaitorPage() {
  const { id } = useParams<{ id: string }>()
  const idEvento = parseEventId(id)
  useEventRealtimeRoom(idEvento)

  const eventDetailQuery = useEventDetailQuery(idEvento)
  const bebidasQuery = useBebidasQuery()
  const envasesQuery = useEnvasesQuery()
  const [filtroEstado, setFiltroEstado] = useState<OrdenEstado | ''>('')
  const ordenesQuery = useOrdenesEventoQuery(
    idEvento,
    filtroEstado ? { estado: filtroEstado } : {},
  )
  const alertasQuery = useAlertasEventoQuery(idEvento)
  const configQuery = useConfigDispensadoQuery(idEvento)

  const cambiarEstadoMutation = useCambiarEstadoOrdenMutation(idEvento ?? -1)
  const dispensarMutation = useDispensarMutation(idEvento ?? -1)
  const reportarMutation = useReportarDispensadoMutation(idEvento ?? -1)

  const [activeTab, setActiveTab] = useState<string>('ordenes')

  const [ordenActionStatus, setOrdenActionStatus] = useState<
    Record<number, 'updating' | 'error'>
  >({})
  const [ordenActionError, setOrdenActionError] = useState<Record<number, string>>({})
  const [dispensarStatus, setDispensarStatus] = useState<Record<number, boolean>>({})
  const [dispensarError, setDispensarError] = useState<Record<number, string>>({})
  const [reportarStatus, setReportarStatus] = useState<Record<number, boolean>>({})
  const [reportarError, setReportarError] = useState<Record<number, string>>({})

  const notFound = idEvento === null || isEventoNotFoundError(eventDetailQuery.error)
  const evento = notFound ? null : (eventDetailQuery.data ?? null)
  const isLoading = idEvento !== null && eventDetailQuery.isPending

  function handleCambiarEstado(idOrden: number, estado: OrdenEstado) {
    setOrdenActionStatus((previous) => ({ ...previous, [idOrden]: 'updating' }))
    setOrdenActionError((previous) => {
      const next = { ...previous }
      delete next[idOrden]
      return next
    })
    cambiarEstadoMutation.mutate(
      { idOrden, estado },
      {
        onSuccess: () =>
          setOrdenActionStatus((previous) => {
            const next = { ...previous }
            delete next[idOrden]
            return next
          }),
        onError: (error) => {
          setOrdenActionStatus((previous) => ({ ...previous, [idOrden]: 'error' }))
          setOrdenActionError((previous) => ({
            ...previous,
            [idOrden]: toSafeErrorMessage(error),
          }))
        },
      },
    )
  }

  function handleDispensar(idDetalle: number) {
    setDispensarStatus((previous) => ({ ...previous, [idDetalle]: true }))
    setDispensarError((previous) => {
      const next = { ...previous }
      delete next[idDetalle]
      return next
    })
    dispensarMutation.mutate(idDetalle, {
      onSuccess: () => {
        setDispensarStatus((previous) => ({ ...previous, [idDetalle]: false }))
      },
      onError: (error) => {
        setDispensarStatus((previous) => ({ ...previous, [idDetalle]: false }))
        setDispensarError((previous) => ({
          ...previous,
          [idDetalle]: toSafeErrorMessage(error),
        }))
      },
    })
  }

  function handleReportar(idDispensado: number, segundosReal: number | null) {
    setReportarStatus((previous) => ({ ...previous, [idDispensado]: true }))
    setReportarError((previous) => {
      const next = { ...previous }
      delete next[idDispensado]
      return next
    })
    reportarMutation.mutate(
      { idDispensado, segundosReal },
      {
        onSuccess: () =>
          setReportarStatus((previous) => ({ ...previous, [idDispensado]: false })),
        onError: (error) => {
          setReportarStatus((previous) => ({ ...previous, [idDispensado]: false }))
          setReportarError((previous) => ({
            ...previous,
            [idDispensado]: toSafeErrorMessage(error),
          }))
        },
      },
    )
  }

  if (isLoading) {
    return (
      <Text size="sm" className="text-muted-foreground" role="status">
        Cargando barra…
      </Text>
    )
  }

  if (!evento) {
    return <EventDetailUnavailableState />
  }

  const bebidasById = new Map(
    (bebidasQuery.data ?? []).map((b) => [b.idBebida, b.nombre]),
  )
  const envasesById = new Map(
    (envasesQuery.data ?? []).map((e) => [e.idEnvase, e.nombre]),
  )
  const configPinById = new Map(
    (configQuery.data ?? []).map((c) => [c.idConfig, c.pinGpio]),
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link to={`/eventos/${String(evento.idEvento)}`}>
            <IconArrowLeft aria-hidden="true" />
            Volver al evento
          </Link>
        </Button>
        <div className="flex flex-col gap-1">
          <Caption>{evento.titulo}</Caption>
          <SectionHeading className="text-heading">
            Barra — Bebidas y Cubaitor
          </SectionHeading>
          <Text size="sm" className="text-muted-foreground">
            Órdenes y dispensado de este evento. La configuración de pines usa el catálogo
            global de bebidas/insumos y la flota de Cubaitor —{' '}
            <Link to="/menu" className="text-primary underline-offset-4 hover:underline">
              gestiónalos aquí
            </Link>
            .
          </Text>
        </div>
        <Button asChild variant="outline" size="sm" className="w-fit">
          <Link to={`/eventos/${String(evento.idEvento)}/panel-operativo`}>
            Ver resumen operativo del evento
          </Link>
        </Button>
      </div>

      {alertasQuery.data ? (
        <EventCubaitorAlertasBanner alertas={alertasQuery.data.alertas} />
      ) : alertasQuery.isError ? (
        <Alert tone="warning" title="No pudimos cargar las alertas">
          <p>{toSafeErrorMessage(alertasQuery.error)}</p>
        </Alert>
      ) : null}

      <EventDetailSection title="Operación de barra">
        <Tabs items={TABS} value={activeTab} onChange={setActiveTab}>
          {activeTab === 'ordenes' ? (
            <OrdenesBoard
              ordenes={ordenesQuery.data}
              isLoading={ordenesQuery.isPending}
              errorMessage={
                ordenesQuery.isError ? toSafeErrorMessage(ordenesQuery.error) : undefined
              }
              onRetry={() => void ordenesQuery.refetch()}
              filtroEstado={filtroEstado}
              onChangeFiltro={setFiltroEstado}
              bebidasById={bebidasById}
              envasesById={envasesById}
              ordenActionStatus={ordenActionStatus}
              ordenActionError={ordenActionError}
              onCambiarEstado={handleCambiarEstado}
              dispensarStatus={dispensarStatus}
              dispensarError={dispensarError}
              onDispensar={handleDispensar}
              configPinById={configPinById}
              reportarStatus={reportarStatus}
              reportarError={reportarError}
              onReportar={handleReportar}
            />
          ) : (
            <ConfigDispensadoSection idEvento={idEvento} />
          )}
        </Tabs>
      </EventDetailSection>
    </div>
  )
}
