import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as bootstrapModule from '@/features/oidc-client/protocol/bootstrap'
import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'
import { useOidcSessionBootstrap } from '@/features/oidc-client/session/useOidcSessionBootstrap'

function TestHost({ returnTo = '/panel' }: { returnTo?: string } = {}) {
  useOidcSessionBootstrap(returnTo)
  return null
}

beforeEach(() => {
  useOidcSessionStore.getState().reset()
  vi.restoreAllMocks()
})

describe('useOidcSessionBootstrap', () => {
  it('sets the session to authenticating immediately, then authenticated on a restored session', async () => {
    let resolveBootstrap!: (value: bootstrapModule.BootstrapOutcome) => void
    vi.spyOn(bootstrapModule, 'bootstrapSession').mockReturnValue(
      new Promise((resolve) => {
        resolveBootstrap = resolve
      }),
    )

    render(<TestHost />)

    expect(useOidcSessionStore.getState().session.status).toBe('authenticating')

    resolveBootstrap({
      kind: 'restored',
      session: {
        accessToken: 'token',
        accessTokenExpiresAt: Date.now() + 900_000,
        user: { sub: 'uuid-1' },
      },
    })

    await waitFor(() => {
      expect(useOidcSessionStore.getState().session.status).toBe('authenticated')
    })
  })

  it('sets the session to anonymous on an anonymous outcome', async () => {
    vi.spyOn(bootstrapModule, 'bootstrapSession').mockResolvedValue({ kind: 'anonymous' })

    render(<TestHost />)

    await waitFor(() => {
      expect(useOidcSessionStore.getState().session.status).toBe('anonymous')
    })
  })

  it('leaves the session in authenticating on a silent-redirect outcome (navigation is under way)', async () => {
    vi.spyOn(bootstrapModule, 'bootstrapSession').mockResolvedValue({
      kind: 'silent-redirect',
    })

    render(<TestHost />)

    await waitFor(() => {
      expect(bootstrapModule.bootstrapSession).toHaveBeenCalledOnce()
    })
    expect(useOidcSessionStore.getState().session.status).toBe('authenticating')
  })

  it('runs bootstrap exactly once even if the host remounts (StrictMode-style double effect)', async () => {
    vi.spyOn(bootstrapModule, 'bootstrapSession').mockResolvedValue({ kind: 'anonymous' })

    const { rerender } = render(<TestHost />)
    rerender(<TestHost />)
    rerender(<TestHost />)

    await waitFor(() => {
      expect(useOidcSessionStore.getState().session.status).toBe('anonymous')
    })
    expect(bootstrapModule.bootstrapSession).toHaveBeenCalledOnce()
  })

  it('forwards the caller-supplied returnTo to bootstrapSession — regression for the F5-lands-on-/panel bug', async () => {
    const spy = vi
      .spyOn(bootstrapModule, 'bootstrapSession')
      .mockResolvedValue({ kind: 'anonymous' })

    render(<TestHost returnTo="/eventos/1001/montaje" />)

    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({}, '/eventos/1001/montaje')
    })
  })

  it('does not run again on a later mount once the session already settled to anonymous', () => {
    useOidcSessionStore.getState().setAnonymous()
    vi.spyOn(bootstrapModule, 'bootstrapSession').mockResolvedValue({ kind: 'anonymous' })

    render(<TestHost />)

    expect(bootstrapModule.bootstrapSession).not.toHaveBeenCalled()
  })

  it('does not run again once the session is already authenticated', () => {
    useOidcSessionStore.getState().setAuthenticated({
      accessToken: 'token',
      accessTokenExpiresAt: Date.now() + 900_000,
      user: { sub: 'uuid-1' },
    })
    vi.spyOn(bootstrapModule, 'bootstrapSession').mockResolvedValue({ kind: 'anonymous' })

    render(<TestHost />)

    expect(bootstrapModule.bootstrapSession).not.toHaveBeenCalled()
  })
})
