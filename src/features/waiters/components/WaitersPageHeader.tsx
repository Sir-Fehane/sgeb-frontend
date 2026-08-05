import { IconUserPlus } from '@tabler/icons-react'
import { useId } from 'react'

import { Button, HelperText, Text } from '@/shared/components'

export interface WaitersPageHeaderProps {
  /**
   * When supplied, enables the invite button and is invoked on
   * activation — the API is designed so a real handler can be wired in
   * later without changing this component. Omitted on this branch: the
   * exact recipient-field set the invite would capture is a genuine,
   * already-documented conflict between the W-04 wireframe (phone-only)
   * and the SSO `POST /auth/invitaciones` contract (name + email +
   * role, no phone — docs/FrontendArchitecture.md §8.2/§19 item 13),
   * and `id_rol_destino`'s integer↔role mapping is undocumented (§7.3).
   * Building a form or claiming this button does anything would mean
   * guessing, so it renders genuinely disabled instead.
   */
  onInvite?: (() => void) | undefined
}

/**
 * No heading is rendered here — `AppShell`'s `Topbar` already renders
 * "Meseros" as the page's `<h1>`; repeating it here would be a
 * redundant duplicate heading (same convention as `EventsPageHeader`).
 */
export function WaitersPageHeader({ onInvite }: WaitersPageHeaderProps) {
  const pendingId = useId()
  const isDisabled = !onInvite

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <Text size="sm" className="text-muted-foreground">
        Consulta y filtra el directorio de meseros.
      </Text>
      <div className="flex flex-col items-end gap-1">
        <Button
          icon={<IconUserPlus aria-hidden="true" />}
          disabled={isDisabled}
          onClick={isDisabled ? undefined : onInvite}
          aria-describedby={isDisabled ? pendingId : undefined}
        >
          Invitar mesero
        </Button>
        {isDisabled ? (
          <HelperText id={pendingId} className="text-right">
            Los campos de la invitación y el mapeo de rol todavía no están definidos.
          </HelperText>
        ) : null}
      </div>
    </div>
  )
}
