import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import {
  OidcCallbackContent,
  type OidcCallbackViewState,
} from '@/features/oidc-client/components/OidcCallbackContent'
import { beginAuthorization } from '@/features/oidc-client/protocol/authorizationRequest'
import { processAuthorizationCallback } from '@/features/oidc-client/protocol/callback'
import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'

interface CallbackView {
  state: OidcCallbackViewState
  message?: string | undefined
}

export interface AuthCallbackPageProps {
  /** Injectable so tests never trigger real browser navigation. Defaults to React Router's `navigate`. */
  navigate?: ((to: string) => void) | undefined
}

/**
 * Routed at `/auth/callback` — outside `AppShell` (nothing here assumes an
 * authenticated shell) and outside `AuthLayout` (that layout is
 * documented as the shell for the frozen, provider-owned S1/S3/S5/S6
 * screens; reusing it here would visually imply this page belongs to that
 * same frozen family, when it's actually sgeb-frontend's own protocol
 * infrastructure — see the README's "Existing Auth UI stays frozen"
 * section). Mirrors `RouteErrorPresentation`'s independent-`<main>`
 * pattern instead.
 *
 * Processes the callback exactly once per mount (`hasProcessed` guards
 * against React StrictMode's intentional double effect invocation in
 * development — without it, the second run would find the transaction
 * already consumed and could show a spurious error after a real success).
 */
export function AuthCallbackPage({ navigate: navigateProp }: AuthCallbackPageProps = {}) {
  const [searchParams] = useSearchParams()
  const routerNavigate = useNavigate()
  const navigate = navigateProp ?? routerNavigate
  const setAuthenticated = useOidcSessionStore((store) => store.setAuthenticated)
  const setError = useOidcSessionStore((store) => store.setError)
  const [view, setView] = useState<CallbackView>({ state: 'processing' })
  const hasProcessed = useRef(false)

  useEffect(() => {
    if (hasProcessed.current) {
      return
    }
    hasProcessed.current = true

    const params = {
      code: searchParams.get('code'),
      state: searchParams.get('state'),
      error: searchParams.get('error'),
    }

    void processAuthorizationCallback(params).then((outcome) => {
      if (outcome.kind === 'success') {
        setAuthenticated(outcome.session)
        setView({ state: 'success' })
        void navigate(outcome.returnTo)
        return
      }

      setError(outcome.message)
      setView({ state: 'error', message: outcome.message })
    })
  }, [searchParams, navigate, setAuthenticated, setError])

  function handleRestart() {
    void beginAuthorization()
  }

  return (
    <OidcCallbackContent
      state={view.state}
      message={view.message}
      onRestart={view.state === 'error' ? handleRestart : undefined}
    />
  )
}
