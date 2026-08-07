import { IconUserCheck } from '@tabler/icons-react'

import type {
  SelectParticipantRequest,
  TeamSelectionParticipantViewModel,
  TeamSelectionRowStatus,
} from '@/features/events/team-selection/types/teamSelection'
import { Badge, Button, Caption, Text } from '@/shared/components'

export interface TeamSelectionCandidateRowProps {
  participant: TeamSelectionParticipantViewModel
  rowStatus: TeamSelectionRowStatus
  onSelect: (request: SelectParticipantRequest) => void
}

const PUESTO_LABELS: Record<TeamSelectionParticipantViewModel['puesto'], string> = {
  mesero: 'Mesero',
  barra: 'Barra',
}

/**
 * One applicant (`estado: 'aparto'`). The "Seleccionar" button is a real
 * `<button disabled>` while `rowStatus === 'selecting'` (native
 * disablement, not `aria-disabled` decoration on a clickable element) —
 * `Button`'s own `loading` prop already sets both `disabled` and
 * `aria-busy`. The accessible name is per-candidate (`Seleccionar a
 * {nombre}`), never a bare repeated "Seleccionar" across rows.
 */
export function TeamSelectionCandidateRow({
  participant,
  rowStatus,
  onSelect,
}: TeamSelectionCandidateRowProps) {
  return (
    <li className="border-border bg-card flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <span className="font-sans text-body-sm font-semibold">{participant.nombre}</span>
        <span className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{PUESTO_LABELS[participant.puesto]}</Badge>
          <Caption>Apartado</Caption>
        </span>
      </div>

      <div className="flex flex-col items-start gap-1 sm:items-end">
        <Button
          type="button"
          size="sm"
          icon={<IconUserCheck aria-hidden="true" />}
          loading={rowStatus === 'selecting'}
          aria-label={`Seleccionar a ${participant.nombre}`}
          onClick={() => {
            onSelect({
              idParticipacion: participant.idParticipacion,
              estado: 'seleccionado',
            })
          }}
        >
          Seleccionar
        </Button>
        {rowStatus === 'error' ? (
          <Text size="sm" className="text-destructive">
            No pudimos seleccionar a este candidato. Intenta de nuevo.
          </Text>
        ) : null}
      </div>
    </li>
  )
}
