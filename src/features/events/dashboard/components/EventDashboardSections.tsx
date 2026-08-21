import type {
  EventDashboardAlertasViewModel,
  EventDashboardAsistenciaViewModel,
  EventDashboardBarraViewModel,
  EventDashboardMontajeViewModel,
  EventDashboardPisoViewModel,
  EventDashboardResumenViewModel,
  EventDashboardServicioViewModel,
} from '@/features/events/dashboard/types/dashboard'
import {
  EventDashboardSectionCard,
  EventDashboardStat,
} from '@/features/events/dashboard/components/EventDashboardSectionCard'
import {
  formatEventDashboardAlertTipo,
  formatEventDashboardCurrency,
  formatEventDashboardRating,
} from '@/features/events/dashboard/utils/eventDashboardFormatting'
import { Badge, Text } from '@/shared/components'

/** Renders a `Record<string, number>` breakdown (`por_estado`-shaped fields) as one stat row per key, in the order the backend returned them. */
function EstadoBreakdown({ porEstado }: { porEstado: Record<string, number> }) {
  const entries = Object.entries(porEstado)
  if (entries.length === 0) {
    return (
      <Text size="sm" className="text-muted-foreground">
        Sin datos todavía.
      </Text>
    )
  }
  return (
    <>
      {entries.map(([estado, count]) => (
        <EventDashboardStat key={estado} label={estado} value={count} />
      ))}
    </>
  )
}

export interface EventDashboardResumenSectionProps {
  idEvento: number
  resumen: EventDashboardResumenViewModel | null
}

export function EventDashboardResumenSection({
  resumen,
}: EventDashboardResumenSectionProps) {
  return (
    <EventDashboardSectionCard title="Resumen" unavailable={resumen === null}>
      {resumen ? (
        <>
          <EventDashboardStat
            label="Meseros inscritos"
            value={`${String(resumen.inscritos)} / ${String(resumen.cupoMeseros)}`}
          />
          <EventDashboardStat label="Lugares disponibles" value={resumen.disponibles} />
          <EventDashboardStat label="Mesas" value={resumen.mesas} />
          <EventDashboardStat
            label="Tarifa por mesero"
            value={formatEventDashboardCurrency(resumen.tarifaPorMesero)}
          />
        </>
      ) : null}
    </EventDashboardSectionCard>
  )
}

export interface EventDashboardAsistenciaSectionProps {
  idEvento: number
  asistencia: EventDashboardAsistenciaViewModel | null
}

export function EventDashboardAsistenciaSection({
  idEvento,
  asistencia,
}: EventDashboardAsistenciaSectionProps) {
  return (
    <EventDashboardSectionCard
      title="Asistencia"
      unavailable={asistencia === null}
      linkTo={`/eventos/${String(idEvento)}/pase-de-lista`}
      linkLabel="Ver pase de lista"
    >
      {asistencia ? (
        <>
          <EstadoBreakdown porEstado={asistencia.porEstado} />
          <EventDashboardStat
            label="Llegadas fallidas"
            value={asistencia.llegadasFallidas}
          />
        </>
      ) : null}
    </EventDashboardSectionCard>
  )
}

export interface EventDashboardMontajeSectionProps {
  idEvento: number
  montaje: EventDashboardMontajeViewModel | null
}

export function EventDashboardMontajeSection({
  idEvento,
  montaje,
}: EventDashboardMontajeSectionProps) {
  return (
    <EventDashboardSectionCard
      title="Montaje"
      unavailable={montaje === null}
      linkTo={`/eventos/${String(idEvento)}/montaje`}
      linkLabel="Ver montaje"
    >
      {montaje ? (
        <>
          <EventDashboardStat label="Participaciones" value={montaje.participaciones} />
          <EventDashboardStat
            label="Checklist aprobado"
            value={montaje.checklistAprobado}
          />
          <EventDashboardStat
            label="Instancias abiertas"
            value={montaje.instanciasAbiertas}
          />
        </>
      ) : null}
    </EventDashboardSectionCard>
  )
}

export interface EventDashboardPisoSectionProps {
  idEvento: number
  piso: EventDashboardPisoViewModel | null
}

export function EventDashboardPisoSection({
  idEvento,
  piso,
}: EventDashboardPisoSectionProps) {
  return (
    <EventDashboardSectionCard
      title="Piso"
      unavailable={piso === null}
      linkTo={`/eventos/${String(idEvento)}/montaje`}
      linkLabel="Ver mesas"
    >
      {piso ? (
        <>
          <EstadoBreakdown porEstado={piso.mesasPorEstado} />
          <EventDashboardStat
            label="Asignaciones vinculadas"
            value={piso.asignacionesVinculadas}
          />
        </>
      ) : null}
    </EventDashboardSectionCard>
  )
}

export interface EventDashboardBarraSectionProps {
  idEvento: number
  barra: EventDashboardBarraViewModel | null
}

/** No dedicated Cubaitor/bar management screen exists yet in this frontend (confirmed — see this branch's report), so this section is summary-only: real counts from `GET /eventos/{id}/dashboard`, no deep link to build against. */
export function EventDashboardBarraSection({ barra }: EventDashboardBarraSectionProps) {
  return (
    <EventDashboardSectionCard title="Barra" unavailable={barra === null}>
      {barra ? (
        <>
          <EventDashboardStat label="Pendientes" value={barra.pendientes} />
          <EventDashboardStat label="En preparación" value={barra.enPreparacion} />
          <EventDashboardStat label="Dispensando" value={barra.dispensando} />
          <EventDashboardStat
            label="Pausadas por insumo"
            value={barra.pausadasPorInsumo}
          />
          <EventDashboardStat label="Entregadas" value={barra.entregadas} />
          <EventDashboardStat label="Canceladas" value={barra.canceladas} />
        </>
      ) : null}
    </EventDashboardSectionCard>
  )
}

export interface EventDashboardServicioSectionProps {
  idEvento: number
  servicio: EventDashboardServicioViewModel | null
}

export function EventDashboardServicioSection({
  idEvento,
  servicio,
}: EventDashboardServicioSectionProps) {
  return (
    <EventDashboardSectionCard
      title="Servicio"
      unavailable={servicio === null}
      linkTo={`/eventos/${String(idEvento)}/solicitudes`}
      linkLabel="Ver solicitudes"
    >
      {servicio ? (
        <>
          <EventDashboardStat
            label="Solicitudes pendientes"
            value={servicio.solicitudesPendientes}
          />
          <EventDashboardStat
            label="Calificación promedio"
            value={
              servicio.promedioCalificacion === null
                ? 'Sin calificaciones'
                : formatEventDashboardRating(servicio.promedioCalificacion)
            }
          />
          <EventDashboardStat
            label="Calificaciones recibidas"
            value={servicio.calificaciones}
          />
          <EventDashboardStat
            label="Calificaciones bajas"
            value={servicio.calificacionesBajas}
          />
        </>
      ) : null}
    </EventDashboardSectionCard>
  )
}

export interface EventDashboardAlertasSectionProps {
  idEvento: number
  alertas: EventDashboardAlertasViewModel | null
}

export function EventDashboardAlertasSection({
  alertas,
}: EventDashboardAlertasSectionProps) {
  return (
    <EventDashboardSectionCard title="Alertas" unavailable={alertas === null}>
      {alertas ? (
        alertas.alertas.length === 0 ? (
          <Text size="sm" className="text-muted-foreground">
            Sin alertas activas.
          </Text>
        ) : (
          <ul aria-label="Alertas activas" className="flex flex-col gap-2">
            {alertas.alertas.map((alerta, index) => (
              // Presentation-only list; no documented per-alert id exists.
              <li
                key={index}
                className="border-border flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
              >
                <Text size="sm">
                  {formatEventDashboardAlertTipo(alerta.tipo)}
                  {alerta.insumo ? ` · ${alerta.insumo}` : ''}
                  {alerta.nombre ? ` · ${alerta.nombre}` : ''}
                </Text>
                <Badge tone={alerta.severidad === 'alta' ? 'danger' : 'warning'}>
                  {alerta.severidad === 'alta' ? 'Alta' : 'Media'}
                </Badge>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </EventDashboardSectionCard>
  )
}
