import type { TeamSelectionParticipantViewModel } from '@/features/events/team-selection/types/teamSelection'
import { Badge, Caption } from '@/shared/components'

export interface TeamSelectionSelectedRowProps {
  participant: TeamSelectionParticipantViewModel
}

const PUESTO_LABELS: Record<TeamSelectionParticipantViewModel['puesto'], string> = {
  mesero: 'Mesero',
  barra: 'Barra',
}

/**
 * A confirmed participant (`estado: 'seleccionado'`). Deliberately no
 * action of any kind — no reverse transition (`seleccionado → aparto`)
 * exists in the current contract (`PATCH /participaciones/{id}/estado`'s
 * own request-body enum never lists `aparto` as a valid target), so this
 * row is read-only by design, not by omission.
 */
export function TeamSelectionSelectedRow({ participant }: TeamSelectionSelectedRowProps) {
  return (
    <li className="border-border bg-card flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <span className="font-sans text-body-sm font-semibold">{participant.nombre}</span>
        <span className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{PUESTO_LABELS[participant.puesto]}</Badge>
          <Caption>Seleccionado</Caption>
        </span>
      </div>
    </li>
  )
}
