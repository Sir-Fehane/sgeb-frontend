/**
 * Payload/event contract for the backend's Socket.IO channel
 * (`tiempo_real_service.ts`, `eventos_dominio.ts` on the pinned backend —
 * confirmed by direct inspection, not invented). Every event below is
 * `server → client` only; the only `client → server` events are
 * `unirse:evento`/`salir:evento` (see `SocketProvider`/`useEventRealtimeRoom`).
 * Every payload carries the server's own `Emitido` shape (`emitido_en`,
 * injected by the backend's bridge, not per-emitter) and is FULL current
 * state, never a delta — reapplying the same or a late event after a
 * reconnect is safe (docs/decisions.md ADR-006).
 *
 * `orden:cambio` and `dispensado:cambio` are registered in
 * `SocketProvider` as of feature/operations-and-reports-live, invalidating
 * the event dashboard's `barra` section (the only real consumer of
 * order/dispensing state so far — see that provider's own comment on
 * those two handlers). There is still no dedicated Orders/Cubaitor
 * feature or per-order query key; a future one would extend those
 * handlers rather than replace them.
 */

export interface Emitido {
  /** ISO 8601, server clock. For discarding stale/duplicate events after a reconnect and measuring clock skew — never for reconstructing event order. */
  emitido_en: string
}

export interface CupoActualizado extends Emitido {
  idEvento: number
  cupoMeseros: number
  ocupados: number
  disponibles: number
}

export interface ParticipacionCambio extends Emitido {
  idEvento: number
  idParticipacion: number
  estado: string
  checklistOk?: boolean
}

export interface MesaCambio extends Emitido {
  idEvento: number
  idMesa: number
  estado: 'libre' | 'ocupada'
  idParticipacion: number | null
  vinculada: boolean
}

export interface ChecklistCambio extends Emitido {
  idEvento: number
  idParticipacion: number
  idInstancia: number
  completado: boolean
  aprobado: boolean
  pendientes: number
}

export interface OrdenCambio extends Emitido {
  idEvento: number
  idOrden: number
  idMesa: number
  estado: string
}

export interface DispensadoCambio extends Emitido {
  idEvento: number
  idDispensado: number
  idDetalle: number
  pinGpio: number
  estado: 'ok' | 'parcial' | 'error' | 'pausado_por_insumo'
  volumenMl: number
  segundos: number
}

export interface AlertaInsumo extends Emitido {
  idEvento: number
  idInsumo: number
  nombreInsumo: string
  motivo: 'botella_vacia' | 'insumo_agotado' | 'sin_configuracion'
  codigo: 'SGEB-4008' | 'SGEB-4009'
  ordenesPausadas: number
}

export interface CronogramaDisparado extends Emitido {
  idEvento: number
  idCronograma: number
  tipoTiempo: 'ENTRADA' | 'FUERTE' | 'POSTRE' | 'OTRO'
  mensaje: string
  destinatarios: number
}

export interface SolicitudCambio extends Emitido {
  idEvento: number
  idSolicitud: number
  idMesa: number
  tipo: string
  estado: 'pendiente' | 'atendida' | 'cancelada'
  idParticipacion: number | null
}

/** Ack shape for `unirse:evento`, exactly as the backend replies (`tiempo_real_service.ts`'s `alConectar`). */
export interface UnirseEventoAck {
  ok: boolean
  sala?: string
  code?: string
  message?: string
}

/** Typed `Socket<ServerToClientEvents, ...>` contract consumed by `socketClient.ts`. */
export interface RealtimeServerToClientEvents {
  'cupo:actualizado': (payload: CupoActualizado) => void
  'participacion:cambio': (payload: ParticipacionCambio) => void
  'mesa:cambio': (payload: MesaCambio) => void
  'checklist:cambio': (payload: ChecklistCambio) => void
  'orden:cambio': (payload: OrdenCambio) => void
  'dispensado:cambio': (payload: DispensadoCambio) => void
  'alerta:insumo': (payload: AlertaInsumo) => void
  'solicitud:cambio': (payload: SolicitudCambio) => void
  'cronograma:disparado': (payload: CronogramaDisparado) => void
}

/** Typed `Socket<..., ClientToServerEvents>` contract consumed by `socketClient.ts`. */
export interface RealtimeClientToServerEvents {
  'unirse:evento': (idEvento: number, ack: (result: UnirseEventoAck) => void) => void
  'salir:evento': (idEvento: number) => void
}
