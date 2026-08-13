import { refreshAccessToken } from '@/features/oidc-client/client/tokenClient'
import { fetchUserInfo } from '@/features/oidc-client/client/userInfoClient'
import { beginAuthorization } from '@/features/oidc-client/protocol/authorizationRequest'
import type { OidcAuthenticatedSession } from '@/features/oidc-client/types/session'

export type BootstrapOutcome =
  | { kind: 'restored'; session: Omit<OidcAuthenticatedSession, 'status'> }
  /** A silent (`prompt=none`) authorization request was just started — a real, full-page navigation is under way (or was attempted); the caller has nothing further to do. */
  | { kind: 'silent-redirect' }
  | { kind: 'anonymous' }

export interface BootstrapSessionDependencies {
  refresh?: typeof refreshAccessToken
  loadUserInfo?: typeof fetchUserInfo
  beginSilentAuthorization?: typeof beginAuthorization
}

/**
 * Cold-start session restoration — pure orchestration, no React, no DOM
 * beyond what its dependencies touch, mirroring `protocol/callback.ts`'s
 * own architecture. Never throws for an expected failure mode.
 *
 * Strategy, per `docs/api/RESPUESTAS-frontend-FINAL.md` §1's confirmed
 * "renovación silenciosa" table:
 *
 * 1. Try `POST /token` (`grant_type=refresh_token`) — cheap, silent, no
 *    navigation. If the HttpOnly refresh cookie is present and valid,
 *    this alone restores the session with no redirect at all. The web
 *    client has no way to know in advance whether the cookie exists
 *    (`document.cookie` is never read for this — see
 *    `client/tokenClient.ts`), so this attempt itself IS the probe.
 * 2. If that fails (no cookie, expired, or any other non-success
 *    outcome) — including the access-token-valid-but-`/userinfo`-failed
 *    case, which is not treated as a usable restored session either —
 *    ask the provider whether its own, separate SSO session is still
 *    alive: `GET /authorize?prompt=none`. This is a full-page redirect;
 *    by the time it resolves this function call is moot (the app has
 *    navigated away). The `login_required` response this may come back
 *    with is handled on the other side, by `protocol/callback.ts`.
 *
 * Any unexpected thrown error (e.g. missing OIDC configuration) at any
 * step is treated as "cannot bootstrap right now" and degrades to
 * `anonymous` without attempting further OIDC calls — if configuration
 * itself is broken, every subsequent call would fail identically, and a
 * broken configuration must never crash application startup.
 *
 * `SSO-1007` (refresh-token reuse) surfaces here as an ordinary
 * `oauth-error` outcome from `refresh()`, handled the same as any other
 * refresh failure: exactly one attempt, never retried, falls through to
 * the silent provider check rather than looping back to refresh again.
 */
export async function bootstrapSession(
  deps: BootstrapSessionDependencies = {},
): Promise<BootstrapOutcome> {
  const refresh = deps.refresh ?? refreshAccessToken
  const loadUserInfo = deps.loadUserInfo ?? fetchUserInfo
  const beginSilent = deps.beginSilentAuthorization ?? beginAuthorization

  try {
    const refreshResult = await refresh()

    if (refreshResult.outcome === 'success') {
      const token = refreshResult.token
      const userInfoResult = await loadUserInfo(token.access_token)

      if (userInfoResult.outcome === 'success') {
        return {
          kind: 'restored',
          session: {
            accessToken: token.access_token,
            accessTokenExpiresAt: Date.now() + token.expires_in * 1000,
            user: userInfoResult.user,
            ...(token.id_token ? { idToken: token.id_token } : {}),
            ...(token.scope ? { scope: token.scope } : {}),
          },
        }
      }
      // A valid access token but an unreadable identity is not a usable
      // restored session — degrade rather than guess who is signed in.
      return { kind: 'anonymous' }
    }
  } catch {
    return { kind: 'anonymous' }
  }

  try {
    await beginSilent({ prompt: 'none' })
  } catch {
    return { kind: 'anonymous' }
  }
  return { kind: 'silent-redirect' }
}
