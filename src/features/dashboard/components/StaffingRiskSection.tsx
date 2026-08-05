import { IconUserPlus } from '@tabler/icons-react'
import { useId } from 'react'

import { DashboardSection } from '@/features/dashboard/components/DashboardSection'
import { DashboardSectionUnavailable } from '@/features/dashboard/components/DashboardSectionUnavailable'
import { StaffingRiskItem } from '@/features/dashboard/components/StaffingRiskItem'
import type { StaffingRiskViewModel } from '@/features/dashboard/types/dashboard'
import { Button, HelperText, Text } from '@/shared/components'

export interface StaffingRiskSectionProps {
  staffingRiesgo: readonly StaffingRiskViewModel[] | null
  /**
   * When supplied, enables "Invitar meseros" and is invoked on
   * activation — the API is designed so a real handler can be wired in
   * later without changing this component. Omitted on this branch: no
   * approved invitation flow exists (same unresolved contract as
   * `WaitersPageHeader`'s "Invitar mesero" — see its comment), so the
   * button renders genuinely disabled instead of opening a modal/route/
   * form that doesn't exist yet.
   */
  onInviteWaiters?: (() => void) | undefined
}

/**
 * `DashboardCapitan.staffing_riesgo` — "el indicador accionable del
 * panel" per the OpenAPI description. The action it names ("invitar
 * meseros") is rendered here as a section-level, genuinely disabled
 * button (mirrors `WaitersPageHeader`'s disabled-invite pattern) rather
 * than a per-event action, since the endpoint documents no per-event
 * invite target.
 */
export function StaffingRiskSection({
  staffingRiesgo,
  onInviteWaiters,
}: StaffingRiskSectionProps) {
  const pendingId = useId()
  const isDisabled = !onInviteWaiters

  return (
    <DashboardSection title="Riesgo de personal">
      {staffingRiesgo === null ? (
        <DashboardSectionUnavailable />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-end gap-1 self-end">
            <Button
              icon={<IconUserPlus aria-hidden="true" />}
              disabled={isDisabled}
              onClick={isDisabled ? undefined : onInviteWaiters}
              aria-describedby={isDisabled ? pendingId : undefined}
            >
              Invitar meseros
            </Button>
            {isDisabled ? (
              <HelperText id={pendingId} className="text-right">
                La invitación de meseros desde el panel todavía no está definida.
              </HelperText>
            ) : null}
          </div>

          {staffingRiesgo.length === 0 ? (
            <Text size="sm" className="text-muted-foreground">
              No hay eventos con riesgo de personal.
            </Text>
          ) : (
            <ul
              aria-label="Eventos con riesgo de personal"
              className="flex flex-col gap-3"
            >
              {staffingRiesgo.map((risk) => (
                <StaffingRiskItem key={risk.idEvento} risk={risk} />
              ))}
            </ul>
          )}
        </div>
      )}
    </DashboardSection>
  )
}
