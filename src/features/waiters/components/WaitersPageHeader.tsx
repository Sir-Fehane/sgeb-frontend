import { IconUserPlus } from '@tabler/icons-react'

import { Button, Text } from '@/shared/components'

export interface WaitersPageHeaderProps {
  onInvite: () => void
  /** Disabled only while the mesero role id (`GET /roles`) hasn't resolved yet — see `WaitersPage`. */
  isInviteDisabled?: boolean
}

/**
 * No heading is rendered here — `AppShell`'s `Topbar` already renders
 * "Meseros" as the page's `<h1>` (same convention as `EventsPageHeader`).
 * `onInvite` is now always real — `POST /usuarios/invitaciones` is a
 * confirmed, live endpoint (`WaitersPage` wires it via
 * `useCreateInvitationMutation`).
 */
export function WaitersPageHeader({
  onInvite,
  isInviteDisabled = false,
}: WaitersPageHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <Text size="sm" className="text-muted-foreground">
        Consulta y filtra el directorio de meseros.
      </Text>
      <Button
        icon={<IconUserPlus aria-hidden="true" />}
        disabled={isInviteDisabled}
        onClick={onInvite}
      >
        Invitar mesero
      </Button>
    </div>
  )
}
