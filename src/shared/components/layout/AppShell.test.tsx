import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

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

const AVAILABLE_ITEMS = NAV_ITEMS.filter((item) => item.status === 'available')
const PENDING_ITEMS = NAV_ITEMS.filter((item) => item.status === 'route-pending')

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

/**
 * Pending items are deliberately NOT exposed with any interactive role
 * (see NavItem), so they can't be looked up via `getByRole('link', ...)`
 * like the available ones — find the element that actually carries
 * `aria-disabled` via the visible label's containing `<li>` instead.
 */
function getPendingElement(label: string): HTMLElement {
  const listItem = screen.getByText(label).closest('li')
  if (!listItem) {
    throw new Error(`Expected "${label}" to be inside an <li>`)
  }
  const wrapper = listItem.querySelector('[aria-disabled="true"]')
  if (!(wrapper instanceof HTMLElement)) {
    throw new Error(`Expected an aria-disabled element for "${label}"`)
  }
  return wrapper
}

describe('AppShell navigation', () => {
  it('keeps all seven wireframe nav items visible', () => {
    renderAppShell('/eventos')

    for (const item of NAV_ITEMS) {
      expect(screen.getByText(item.label)).toBeInTheDocument()
    }
  })

  it('renders only the four approved items as real, activatable links', () => {
    renderAppShell('/eventos')

    expect(screen.getAllByRole('link')).toHaveLength(AVAILABLE_ITEMS.length)

    for (const item of AVAILABLE_ITEMS) {
      const link = screen.getByRole('link', { name: item.label })
      expect(link).toHaveAttribute('href', item.href)
      expect(link).not.toHaveAttribute('aria-disabled')
    }
  })

  it('renders the three unresolved items as visible, non-interactive, aria-disabled placeholders — never exposed as links', () => {
    renderAppShell('/eventos')

    for (const item of PENDING_ITEMS) {
      // Not reachable via an interactive role at all.
      expect(
        screen.queryByRole('link', { name: new RegExp(item.label) }),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: new RegExp(item.label) }),
      ).not.toBeInTheDocument()

      const pending = getPendingElement(item.label)
      expect(pending).not.toHaveAttribute('role')
      expect(pending).toHaveAttribute('aria-disabled', 'true')
      expect(pending).not.toHaveAttribute('href')
      expect(pending).not.toHaveAttribute('tabindex')

      // The label and its "Ruta pendiente" status are both still
      // present as ordinary reading-order text — not color alone.
      expect(pending).toHaveTextContent(item.label)
      expect(pending).toHaveTextContent('Ruta pendiente')
    }
  })

  it('does not navigate when a pending item is clicked', async () => {
    const user = userEvent.setup()
    renderAppShell('/eventos')

    await user.click(getPendingElement('Pagos'))

    expect(screen.getByTestId('location')).toHaveTextContent('/eventos')
  })

  it('marks only the active route with aria-current, and never on a pending item', () => {
    renderAppShell('/eventos')

    expect(screen.getByRole('link', { name: 'Eventos' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: 'Panel' })).not.toHaveAttribute(
      'aria-current',
    )
    for (const item of PENDING_ITEMS) {
      expect(getPendingElement(item.label)).not.toHaveAttribute('aria-current')
    }
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
