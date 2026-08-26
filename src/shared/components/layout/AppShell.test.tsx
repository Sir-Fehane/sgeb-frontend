import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'
import type { OidcRole } from '@/features/oidc-client/types/userInfo'
import { AppShell } from '@/shared/components/layout/AppShell'
import { NAV_ITEMS } from '@/shared/components/layout/nav-items'

/**
 * `AppShell` renders `Topbar`, which now renders the real `NotificationBell`
 * (feature/panel-realtime-notifications) — that calls `useSocket()`, which
 * throws outside a `SocketProvider`. This file renders `AppShell` directly
 * (no `AppShellLayout`/`SocketProvider` in the tree, unlike
 * `AppShellLayout.test.tsx`), so the whole realtime hook is stubbed to a
 * minimal, disconnected context instead. Notification-bell-specific
 * behavior (badge, dropdown, mark-read) is covered by
 * `NotificationBell.test.tsx`, not here — this file stays scoped to layout
 * chrome/navigation, as it already was.
 */
vi.mock('@/shared/realtime/useSocket', () => ({
  useSocket: () => ({
    connected: true,
    reconnecting: false,
    lastError: null,
    joinEventRoom: vi.fn(),
    leaveEventRoom: vi.fn(),
  }),
}))

function LocationDisplay() {
  const location = useLocation()
  return <p data-testid="location">{location.pathname}</p>
}

function renderAppShell(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AppShell title="Test">
        <LocationDisplay />
      </AppShell>
    </MemoryRouter>,
  )
}

function authenticate(rol: OidcRole) {
  useOidcSessionStore.getState().setAuthenticated({
    accessToken: 'test-access-token',
    accessTokenExpiresAt: Date.now() + 900_000,
    user: {
      sub: 'uuid-test-user',
      name: 'Test User',
      email: 'test@example.com',
      rol,
    },
  })
}

beforeEach(() => {
  useOidcSessionStore.getState().reset()
})

describe('AppShell navigation', () => {
  it('keeps every nav item visible to an admin session, each a real, activatable link (feature/app-shell-hardening removed the two route-pending placeholders; feature/admin-users-roles-audit-live added the two admin-console entries)', () => {
    authenticate('admin')
    renderAppShell('/eventos')

    expect(screen.getAllByRole('link')).toHaveLength(NAV_ITEMS.length)

    for (const item of NAV_ITEMS) {
      const link = screen.getByRole('link', { name: item.label })
      expect(link).toHaveAttribute('href', item.href)
      expect(link).not.toHaveAttribute('aria-disabled')
    }
  })

  it('hides both admin-only entries (Usuarios, Bitácora) for a capitán session — "Usuarios" is product-scoped to admin alone, even though the backend still permits a capitán to call GET /usuarios', () => {
    authenticate('capitan')
    renderAppShell('/eventos')

    expect(screen.queryByRole('link', { name: 'Usuarios' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Bitácora' })).not.toBeInTheDocument()
  })

  it('hides every capitán/admin-only entry (Meseros, Bebidas y Cubaitor, Checklists) for a mesero session — this web console is not the mesero product (native iOS app), so a stray mesero session sees none of them', () => {
    authenticate('mesero')
    renderAppShell('/eventos')

    expect(screen.queryByRole('link', { name: 'Meseros' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Bebidas y Cubaitor' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Checklists' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Usuarios' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Bitácora' })).not.toBeInTheDocument()
  })

  it('hides both admin-console entries before a session is authenticated', () => {
    renderAppShell('/eventos')

    expect(screen.queryByRole('link', { name: 'Usuarios' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Bitácora' })).not.toBeInTheDocument()
  })

  it('marks only the active route with aria-current', () => {
    renderAppShell('/eventos')

    expect(screen.getByRole('link', { name: 'Eventos' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: 'Panel' })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('exposes the expected landmarks', () => {
    renderAppShell('/panel')

    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(
      screen.getByRole('navigation', { name: 'Navegación principal' }),
    ).toBeInTheDocument()
  })
})

describe('AppShell mobile drawer', () => {
  it('opens the mobile drawer from the trigger and closes it via its close button', async () => {
    const user = userEvent.setup()
    renderAppShell('/panel')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Abrir navegación' }))
    expect(screen.getByRole('dialog', { name: 'Menú de navegación' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cerrar navegación' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('closes the mobile drawer on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    renderAppShell('/panel')

    const trigger = screen.getByRole('button', { name: 'Abrir navegación' })
    await user.click(trigger)
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(trigger).toHaveFocus()
  })

  it('navigates and closes the drawer when an available item is activated from inside it', async () => {
    const user = userEvent.setup()
    renderAppShell('/panel')

    await user.click(screen.getByRole('button', { name: 'Abrir navegación' }))
    const dialog = screen.getByRole('dialog')

    // Both the desktop Sidebar and the open drawer render "Eventos" while
    // the drawer is open, so scope the query to the drawer itself.
    await user.click(within(dialog).getByRole('link', { name: 'Eventos' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(dialog).not.toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/eventos')
  })

  it('marks the rest of the app inert while open, and removes it on close', async () => {
    const user = userEvent.setup()
    renderAppShell('/panel')

    const main = screen.getByRole('main')
    expect(main.closest('[inert]')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Abrir navegación' }))
    expect(main.closest('[inert]')).not.toBeNull()

    const dialog = screen.getByRole('dialog')
    expect(dialog.closest('[inert]')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Cerrar navegación' }))
    await waitFor(() => {
      expect(main.closest('[inert]')).toBeNull()
    })
  })

  it('locks and restores document.body scroll across an open/close cycle', async () => {
    const user = userEvent.setup()
    document.body.style.overflow = 'scroll'
    renderAppShell('/panel')

    await user.click(screen.getByRole('button', { name: 'Abrir navegación' }))
    expect(document.body.style.overflow).toBe('hidden')

    await user.click(screen.getByRole('button', { name: 'Cerrar navegación' }))
    await waitFor(() => {
      expect(document.body.style.overflow).toBe('scroll')
    })

    document.body.style.overflow = ''
  })

  it('restores document.body scroll if the component unmounts while the drawer is open', async () => {
    const user = userEvent.setup()
    document.body.style.overflow = 'scroll'
    const { unmount } = renderAppShell('/panel')

    await user.click(screen.getByRole('button', { name: 'Abrir navegación' }))
    expect(document.body.style.overflow).toBe('hidden')

    unmount()

    expect(document.body.style.overflow).toBe('scroll')
    document.body.style.overflow = ''
  })
})
