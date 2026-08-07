import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { AppShellLayout } from '@/app/router/layouts/AppShellLayout'

function renderAt(pathname: string) {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <AppShellLayout />
    </MemoryRouter>,
  )
}

/**
 * Regression coverage for the Topbar title-matching logic's segment
 * safety (widened in feature/event-detail-ui-foundation to cover nested
 * routes like `/eventos/:id`). `startsWith(`${item.href}/`)` — with the
 * trailing slash — is what prevents a path that merely shares a text
 * prefix (`/eventos-extra`, `/eventos123`) from being mistaken for a
 * genuine nested segment of `/eventos`.
 */
describe('AppShellLayout — Topbar title matching is segment-safe', () => {
  it('matches the exact nav href', () => {
    renderAt('/eventos')

    expect(screen.getByRole('heading', { level: 1, name: 'Eventos' })).toBeInTheDocument()
  })

  it('matches a genuine nested route segment', () => {
    renderAt('/eventos/123')

    expect(screen.getByRole('heading', { level: 1, name: 'Eventos' })).toBeInTheDocument()
  })

  it('does not match a path that merely shares a text prefix, with no segment boundary', () => {
    renderAt('/eventos-extra')

    expect(screen.getByRole('heading', { level: 1, name: 'SGEB' })).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { level: 1, name: 'Eventos' }),
    ).not.toBeInTheDocument()
  })

  it('does not match a path with no separator at all', () => {
    renderAt('/eventos123')

    expect(screen.getByRole('heading', { level: 1, name: 'SGEB' })).toBeInTheDocument()
  })

  it('applies the same segment-safe rule to every nav item, not only /eventos', () => {
    renderAt('/panel-extra')

    expect(screen.getByRole('heading', { level: 1, name: 'SGEB' })).toBeInTheDocument()
  })
})
