import { IconLogout, IconUserCircle } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'

import { logout } from '@/features/oidc-client/client/logoutUrl'
import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'
import type { OidcRole } from '@/features/oidc-client/types/userInfo'
import { cn } from '@/shared/utils/cn'

const ROLE_LABELS: Record<OidcRole, string> = {
  admin: 'Administrador',
  capitan: 'Capitán',
  mesero: 'Mesero',
}

function initialsFor(name: string | undefined): string {
  if (!name) {
    return ''
  }
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return `${first}${last}`.toUpperCase()
}

/**
 * Replaces the previous `AccountMenuPlaceholder` (rendered permanently
 * `disabled`) — real session identity, sourced from the same `GET
 * /userinfo` data `AppShellLayout` already waits on before rendering
 * `Topbar` at all (`useOidcSessionStore`, populated by
 * `useOidcSessionBootstrap`). Same click-outside/Escape dropdown
 * convention as `NotificationBell`.
 *
 * No edit-profile action, still: `GET /usuarios/me` is confirmed fixed and
 * live as of v1.13 (`features/account/services/usuariosApi.ts`'s
 * `fetchMiPerfil`/`updateMiPerfil` now exist), but this branch is a
 * contract-sync, not a profile feature — building the edit UI itself is
 * out of scope here (see the branch report's recommended next branch).
 * Until then this menu only ever displays real, already-available
 * `/userinfo` fields plus the one real, already-wired action: logout
 * (`features/oidc-client/client/logoutUrl.ts`'s `logout()`, previously
 * implemented but called from nowhere).
 */
export function AccountMenu() {
  const session = useOidcSessionStore((state) => state.session)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  if (session.status !== 'authenticated') {
    // `Topbar` only ever renders inside `AppShellLayout`'s
    // `status === 'authenticated'` boundary, so this is never reachable in
    // practice — guarded defensively rather than assumed, same convention
    // used throughout this branch for "never observed" cases.
    return (
      <button
        type="button"
        disabled
        aria-label="Cuenta"
        className="text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-60"
      >
        <IconUserCircle aria-hidden="true" className="size-6" />
      </button>
    )
  }

  const { user, idToken } = session
  const displayName = user.name ?? user.email ?? 'Cuenta'
  const initials = initialsFor(user.name)

  function handleLogout() {
    logout(idToken ? { idTokenHint: idToken } : {})
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Cuenta de ${displayName}`}
        title={displayName}
        onClick={() => {
          setOpen((value) => !value)
        }}
        className={cn(
          'bg-secondary text-secondary-foreground flex size-10 shrink-0 items-center justify-center rounded-full',
          'hover:opacity-90',
          'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        )}
      >
        {initials ? (
          <span aria-hidden="true" className="font-sans text-body-sm font-semibold">
            {initials}
          </span>
        ) : (
          <IconUserCircle aria-hidden="true" className="size-6" />
        )}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Cuenta"
          className="bg-card border-border absolute top-full right-0 z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-lg border shadow-lg"
        >
          <div className="border-border border-b px-4 py-3">
            <p className="font-sans text-body-sm text-foreground truncate font-semibold">
              {user.name ?? 'Sin nombre registrado'}
            </p>
            {user.email ? (
              <p className="text-caption text-muted-foreground truncate">{user.email}</p>
            ) : null}
            {user.rol ? (
              <p className="text-caption text-muted-foreground mt-1">
                {ROLE_LABELS[user.rol]}
              </p>
            ) : null}
          </div>
          <div className="p-1">
            <button
              type="button"
              onClick={handleLogout}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left',
                'font-sans text-body-sm text-foreground',
                'hover:bg-accent focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2',
              )}
            >
              <IconLogout aria-hidden="true" className="size-4" />
              Cerrar sesión
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
