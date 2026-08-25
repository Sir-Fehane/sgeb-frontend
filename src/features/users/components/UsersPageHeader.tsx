import { IconUserPlus } from '@tabler/icons-react'
import { Link } from 'react-router-dom'

import { Button, Text } from '@/shared/components'

export interface UsersPageHeaderProps {
  /**
   * Only true for an `admin` session (`InvitacionesController.crear`'s own
   * role gate: a `capitan` may only invite `mesero`, so this button would
   * otherwise fail with `SGEB-1004`). `undefined`/omitted renders nothing,
   * same as leaving `onInviteStaff` unset.
   */
  canInviteStaff?: boolean
  onInviteStaff?: () => void
  /** Disabled only while the invitable roles (`GET /roles`) haven't resolved yet — see `UsersPage`, same pattern `WaitersPageHeader`'s `isInviteDisabled` already uses. */
  isInviteStaffDisabled?: boolean
}

/**
 * No heading is rendered here — `AppShell`'s `Topbar` already renders
 * "Usuarios" as the page's `<h1>`, same convention as `WaitersPageHeader`.
 *
 * No "Crear usuario" action: `POST /usuarios` creates a permanently
 * password-less account (see `docs/decisions.md`-style reasoning captured
 * in this branch's report) unless a separate invitation is issued for the
 * same correo — and the invitations flow rejects an email that already has
 * an account (`SSO-2005`). Onboarding stays exclusively through
 * Invitaciones: "Invitar mesero" links to `/meseros` (`features/waiters`,
 * the only place that flow lives); "Invitar capitán o admin" (admin-only,
 * `canInviteStaff`) opens `InviteStaffDialog` right here instead of
 * duplicating the mesero-only form — see `UsersPage.tsx`'s wiring.
 */
export function UsersPageHeader({
  canInviteStaff = false,
  onInviteStaff,
  isInviteStaffDisabled = false,
}: UsersPageHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <Text size="sm" className="text-muted-foreground">
        Consulta y administra las cuentas del sistema.
      </Text>
      <div className="flex flex-wrap gap-2">
        {canInviteStaff ? (
          <Button
            type="button"
            variant="outline"
            disabled={isInviteStaffDisabled}
            onClick={onInviteStaff}
          >
            <IconUserPlus aria-hidden="true" />
            Invitar capitán o admin
          </Button>
        ) : null}
        <Button asChild variant="outline">
          <Link to="/meseros">
            <IconUserPlus aria-hidden="true" />
            Invitar mesero
          </Link>
        </Button>
      </div>
    </div>
  )
}
