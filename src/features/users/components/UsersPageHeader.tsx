import { IconUserPlus } from '@tabler/icons-react'
import { Link } from 'react-router-dom'

import { Button, Text } from '@/shared/components'

/**
 * No heading is rendered here — `AppShell`'s `Topbar` already renders
 * "Usuarios" as the page's `<h1>`, same convention as `WaitersPageHeader`.
 *
 * No "Crear usuario" action: `POST /usuarios` creates a permanently
 * password-less account (see `docs/decisions.md`-style reasoning captured
 * in this branch's report) unless a separate invitation is issued for the
 * same correo — and the invitations flow rejects an email that already has
 * an account (`SSO-2005`). Onboarding stays exclusively through
 * Invitaciones, so this links there instead of duplicating a broken create
 * path. Invitaciones only ever issues `mesero` invitations today
 * (`features/waiters` — see this branch's report for why a generalized
 * role-picker invite isn't built here), so the link is framed accordingly
 * rather than implying it covers every role.
 */
export function UsersPageHeader() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <Text size="sm" className="text-muted-foreground">
        Consulta y administra las cuentas del sistema.
      </Text>
      <Button asChild variant="outline">
        <Link to="/meseros">
          <IconUserPlus aria-hidden="true" />
          Invitar mesero
        </Link>
      </Button>
    </div>
  )
}
