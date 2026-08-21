import { useState } from 'react'

import {
  ORDEN_TRANSICIONES_PERMITIDAS,
  type DispensarResultViewModel,
  type OrdenDetalleViewModel,
  type OrdenEstado,
  type OrdenViewModel,
} from '@/features/events/cubaitor/types/eventCubaitor'
import { Badge, Button, Card, CardContent, Input, Text } from '@/shared/components'

const ORDEN_ESTADO_LABEL: Record<OrdenEstado, string> = {
  pendiente: 'Pendiente',
  en_preparacion: 'En preparación',
  dispensando: 'Dispensando',
  entregada: 'Entregada',
  cancelada: 'Cancelada',
  pausada_por_insumo: 'Pausada (falta insumo)',
}

const ORDEN_ESTADO_TONE: Record<
  OrdenEstado,
  'neutral' | 'info' | 'success' | 'danger' | 'warning'
> = {
  pendiente: 'neutral',
  en_preparacion: 'info',
  dispensando: 'info',
  entregada: 'success',
  cancelada: 'neutral',
  pausada_por_insumo: 'danger',
}

const DETALLE_ESTADO_LABEL: Record<OrdenDetalleViewModel['estado'], string> = {
  pendiente: 'Pendiente',
  dispensada: 'Dispensada',
  entregada: 'Entregada',
  pausada_por_insumo: 'Pausada',
}

interface DetalleRowProps {
  detalle: OrdenDetalleViewModel
  bebidaNombre: string
  envaseNombre: string
  dispensando: boolean
  dispensarError: string | undefined
  onDispensar: () => void
  ultimoResultado: DispensarResultViewModel | undefined
  reportando: Record<number, boolean>
  reportarError: Record<number, string>
  onReportar: (idDispensado: number, segundosReal: number | null) => void
}

function DetalleRow({
  detalle,
  bebidaNombre,
  envaseNombre,
  dispensando,
  dispensarError,
  onDispensar,
  ultimoResultado,
  reportando,
  reportarError,
  onReportar,
}: DetalleRowProps) {
  return (
    <li className="border-border flex flex-col gap-2 rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Text size="sm" className="font-medium">
          {detalle.cantidad}× {bebidaNombre} ({envaseNombre}, {detalle.volumenTotalMl} ml)
        </Text>
        <Badge tone={detalle.estado === 'pausada_por_insumo' ? 'danger' : 'neutral'}>
          {DETALLE_ESTADO_LABEL[detalle.estado]}
        </Badge>
      </div>

      {detalle.estado === 'pendiente' ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          loading={dispensando}
          onClick={onDispensar}
          className="w-fit"
        >
          Dispensar
        </Button>
      ) : null}
      {dispensarError ? (
        <Text size="sm" className="text-destructive">
          {dispensarError}
        </Text>
      ) : null}

      {ultimoResultado
        ? ultimoResultado.instrucciones.map((instruccion) => (
            <ManualReportRow
              key={instruccion.idDispensado}
              instruccion={instruccion}
              reportando={reportando[instruccion.idDispensado] ?? false}
              error={reportarError[instruccion.idDispensado]}
              onReportar={(segundosReal) =>
                onReportar(instruccion.idDispensado, segundosReal)
              }
            />
          ))
        : null}
    </li>
  )
}

function ManualReportRow({
  instruccion,
  reportando,
  error,
  onReportar,
}: {
  instruccion: DispensarResultViewModel['instrucciones'][number]
  reportando: boolean
  error: string | undefined
  onReportar: (segundosReal: number | null) => void
}) {
  const [segundos, setSegundos] = useState(instruccion.segundos)

  return (
    <div className="bg-muted/40 flex flex-col gap-2 rounded-md p-2">
      <Text size="sm" className="text-muted-foreground">
        Enviado al Cubaitor: pin {instruccion.pinGpio}, {instruccion.volumenMl} ml, ~
        {instruccion.segundos.toFixed(1)} s. Si el dispositivo no confirma
        automáticamente, reporta el resultado real aquí.
      </Text>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="number"
          min={0}
          max={99.99}
          step="0.1"
          value={segundos}
          disabled={reportando}
          onChange={(event) => setSegundos(Number(event.target.value))}
          className="w-24"
          aria-label="Segundos reales"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          loading={reportando}
          onClick={() => onReportar(segundos)}
        >
          Confirmar resultado
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={reportando}
          onClick={() => onReportar(null)}
        >
          El dispositivo no respondió
        </Button>
      </div>
      {error ? (
        <Text size="sm" className="text-destructive">
          {error}
        </Text>
      ) : null}
    </div>
  )
}

export interface OrdenCardProps {
  orden: OrdenViewModel
  bebidasById: ReadonlyMap<number, string>
  envasesById: ReadonlyMap<number, string>
  actionStatus: 'updating' | 'error' | undefined
  actionError: string | undefined
  onCambiarEstado: (estado: OrdenEstado) => void
  dispensarStatus: Record<number, boolean>
  dispensarError: Record<number, string>
  onDispensar: (idDetalle: number) => void
  ultimosResultados: Record<number, DispensarResultViewModel>
  reportarStatus: Record<number, boolean>
  reportarError: Record<number, string>
  onReportar: (idDispensado: number, segundosReal: number | null) => void
}

/** One order ("comanda de barra") — mesa, status, and its line items with per-line dispensing controls. */
export function OrdenCard({
  orden,
  bebidasById,
  envasesById,
  actionStatus,
  actionError,
  onCambiarEstado,
  dispensarStatus,
  dispensarError,
  onDispensar,
  ultimosResultados,
  reportarStatus,
  reportarError,
  onReportar,
}: OrdenCardProps) {
  const permitidas = ORDEN_TRANSICIONES_PERMITIDAS[orden.estado]
  const puedeCancelar = permitidas.includes('cancelada')
  const puedeEntregar =
    permitidas.includes('entregada') &&
    orden.detalles.every((d) => d.estado === 'dispensada' || d.estado === 'entregada')

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Text className="font-medium">
            Mesa {orden.idMesa} · Orden #{orden.idOrden}
          </Text>
          <Badge tone={ORDEN_ESTADO_TONE[orden.estado]}>
            {ORDEN_ESTADO_LABEL[orden.estado]}
          </Badge>
        </div>

        <ul className="flex flex-col gap-2">
          {orden.detalles.map((detalle) => (
            <DetalleRow
              key={detalle.idDetalle}
              detalle={detalle}
              bebidaNombre={
                bebidasById.get(detalle.idBebida) ?? `Bebida ${String(detalle.idBebida)}`
              }
              envaseNombre={
                envasesById.get(detalle.idEnvase) ?? `Envase ${String(detalle.idEnvase)}`
              }
              dispensando={dispensarStatus[detalle.idDetalle] ?? false}
              dispensarError={dispensarError[detalle.idDetalle]}
              onDispensar={() => onDispensar(detalle.idDetalle)}
              ultimoResultado={ultimosResultados[detalle.idDetalle]}
              reportando={reportarStatus}
              reportarError={reportarError}
              onReportar={onReportar}
            />
          ))}
        </ul>

        {puedeCancelar || puedeEntregar ? (
          <div className="flex flex-wrap items-center gap-2">
            {puedeEntregar ? (
              <Button
                type="button"
                size="sm"
                loading={actionStatus === 'updating'}
                onClick={() => onCambiarEstado('entregada')}
              >
                Marcar como entregada
              </Button>
            ) : null}
            {puedeCancelar ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                loading={actionStatus === 'updating'}
                onClick={() => onCambiarEstado('cancelada')}
              >
                Cancelar orden
              </Button>
            ) : null}
          </div>
        ) : null}
        {actionError ? (
          <Text size="sm" className="text-destructive">
            {actionError}
          </Text>
        ) : null}
      </CardContent>
    </Card>
  )
}
