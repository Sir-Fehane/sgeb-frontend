import type { EventAttendanceParticipantViewModel } from '@/features/events/attendance/types/attendance'
import { formatArrivalTime } from '@/features/events/attendance/utils/attendanceFormatting'
import {
  ARRIVAL_METODO_LABELS,
  arrivalRequiresAttention,
  MOTIVO_FALLO_PRESENTATION,
  PARTICIPATION_LABELS,
  PARTICIPATION_TONES,
} from '@/features/events/attendance/utils/attendancePresentation'
import { Badge, Caption, Text } from '@/shared/components'

export interface EventAttendanceParticipantRowProps {
  participant: EventAttendanceParticipantViewModel
}

const PUESTO_LABELS: Record<EventAttendanceParticipantViewModel['puesto'], string> = {
  mesero: 'Mesero',
  barra: 'Barra',
}

/**
 * Purely observational — no button, no action, no callback prop of any
 * kind. `estadoParticipacion` and `ultimaConfirmacionLlegada` are
 * rendered as two independent lines on purpose (see
 * `types/attendance.ts`'s module comment): a failed/inconclusive arrival
 * attempt never implies the participation regressed, and a successful
 * one only ever appears alongside `estadoParticipacion ===
 * 'confirmo_llegada'`. Verification detail (método, distancia,
 * precisión, dispositivo vinculado) is deliberately secondary — smaller,
 * muted text below the primary status — and never includes
 * `uuid_dispositivo` or `id_confirmacion`, neither of which has a
 * captain-facing purpose.
 */
export function EventAttendanceParticipantRow({
  participant,
}: EventAttendanceParticipantRowProps) {
  const { estadoParticipacion, ultimaConfirmacionLlegada } = participant

  return (
    <li className="border-border bg-card flex flex-col gap-2 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-sans text-body-sm font-semibold">{participant.nombre}</span>
        <Badge tone="neutral">{PUESTO_LABELS[participant.puesto]}</Badge>
      </div>

      <div>
        <Badge tone={PARTICIPATION_TONES[estadoParticipacion]}>
          {PARTICIPATION_LABELS[estadoParticipacion]}
        </Badge>
      </div>

      {estadoParticipacion === 'confirmo_llegada' && ultimaConfirmacionLlegada ? (
        <Text size="sm">
          Llegada confirmada ·{' '}
          <time dateTime={ultimaConfirmacionLlegada.timestamp}>
            {formatArrivalTime(ultimaConfirmacionLlegada.timestamp)}
          </time>
        </Text>
      ) : ultimaConfirmacionLlegada ? (
        <div className="flex flex-col gap-1">
          <Text size="sm" className="font-medium">
            Llegada no validada
          </Text>
          {ultimaConfirmacionLlegada.motivoFallo ? (
            <>
              <Badge
                tone={
                  MOTIVO_FALLO_PRESENTATION[ultimaConfirmacionLlegada.motivoFallo].tone
                }
              >
                {MOTIVO_FALLO_PRESENTATION[ultimaConfirmacionLlegada.motivoFallo].label}
              </Badge>
              {arrivalRequiresAttention(ultimaConfirmacionLlegada) ? (
                <Text size="sm" className="text-destructive font-medium">
                  Requiere revisión
                </Text>
              ) : null}
            </>
          ) : null}
          <Caption className="text-muted-foreground">
            {ARRIVAL_METODO_LABELS[ultimaConfirmacionLlegada.metodo]} ·{' '}
            {ultimaConfirmacionLlegada.dispositivoVinculado
              ? 'Dispositivo vinculado'
              : 'Dispositivo no vinculado a este usuario'}{' '}
            ·{' '}
            <time dateTime={ultimaConfirmacionLlegada.timestamp}>
              {formatArrivalTime(ultimaConfirmacionLlegada.timestamp)}
            </time>
          </Caption>
        </div>
      ) : (
        <Text size="sm" className="text-muted-foreground">
          Llegada pendiente
        </Text>
      )}
    </li>
  )
}
