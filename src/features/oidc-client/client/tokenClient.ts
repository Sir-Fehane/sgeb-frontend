import axios from 'axios'

import { getOidcConfig } from '@/features/oidc-client/config/oidcConfig'
import {
  RefreshLockUnavailableError,
  withRefreshLock,
  type WithRefreshLock,
} from '@/features/oidc-client/session/refreshLock'
import type {
  OAuthErrorResponse,
  WebTokenResponse,
} from '@/features/oidc-client/types/protocol'

/**
 * Typed transport for `POST /token` (`docs/sso/openapi-sso.yaml` v2.2.0).
 * This is a protocol endpoint: form-urlencoded body, no `{ result, data }`
 * envelope, `credentials: include` so the provider can set/read its
 * HttpOnly refresh cookie. CLAUDE.md mandates Axios over `fetch()`
 * project-wide, so this stays on Axios — configured per-call for the
 * protocol's actual shape (`validateStatus` lets a 400 `ErrorOAuth` body
 * be read directly instead of throwing).
 */
export interface TokenHttpResponse {
  status: number
  body: unknown
}

export type TokenTransport = (
  endpoint: string,
  body: URLSearchParams,
) => Promise<TokenHttpResponse>

const defaultTokenTransport: TokenTransport = async (endpoint, body) => {
  const response = await axios.post(endpoint, body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    withCredentials: true,
    validateStatus: () => true,
  })
  return { status: response.status, body: response.data }
}

export type TokenResult =
  | { outcome: 'success'; token: WebTokenResponse }
  | { outcome: 'oauth-error'; error: OAuthErrorResponse }
  | { outcome: 'network-error'; message: string }

function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 300
}

export interface ExchangeAuthorizationCodeParams {
  code: string
  redirectUri: string
  codeVerifier: string
}

/**
 * `grant_type=authorization_code`. Sends exactly the five documented
 * fields — no client secret, no JSON body. The code is one-use only by
 * provider contract (SSO-1015); this function makes exactly one attempt
 * and never retries automatically, since a second attempt with the same
 * code is itself the failure mode the provider treats as interception.
 * Never logs `code` or `code_verifier` (SSO-1016's own instruction).
 */
export async function exchangeAuthorizationCode(
  params: ExchangeAuthorizationCodeParams,
  transport: TokenTransport = defaultTokenTransport,
): Promise<TokenResult> {
  const config = getOidcConfig()
  const body = new URLSearchParams()
  body.set('grant_type', 'authorization_code')
  body.set('client_id', config.clientId)
  body.set('code', params.code)
  body.set('redirect_uri', params.redirectUri)
  body.set('code_verifier', params.codeVerifier)

  let response: TokenHttpResponse
  try {
    response = await transport(`${config.issuer}/token`, body)
  } catch {
    return {
      outcome: 'network-error',
      message: 'No pudimos comunicarnos con el proveedor de identidad.',
    }
  }

  if (isSuccessStatus(response.status)) {
    return { outcome: 'success', token: response.body as WebTokenResponse }
  }
  return { outcome: 'oauth-error', error: response.body as OAuthErrorResponse }
}

/**
 * Same-tab single-flight coordination: while a refresh is in flight, every
 * additional caller in this JS context shares the same promise instead of
 * firing a second `/token` request. Cleared unconditionally once the
 * in-flight call settles (success or failure), so a later call always
 * starts a fresh attempt — a failure never leaves this permanently locked.
 *
 * This is same-tab only — it composes with, but does not replace, the
 * cross-tab lock `performRefresh` acquires below via
 * `session/refreshLock.ts` around the actual network call. Layering it
 * this way (same-tab dedup first, cross-tab lock only around the one
 * deduped attempt) is what keeps "concurrent callers inside the same tab
 * share one promise" true even with cross-tab coordination in place —
 * acquiring the cross-tab lock once per same-tab caller would instead
 * serialize them into N separate network calls.
 */
let inFlightRefresh: Promise<TokenResult> | null = null

async function performRefresh(
  transport: TokenTransport,
  withLock: WithRefreshLock,
): Promise<TokenResult> {
  const config = getOidcConfig()
  const body = new URLSearchParams()
  body.set('grant_type', 'refresh_token')
  body.set('client_id', config.clientId)

  let response: TokenHttpResponse
  try {
    response = await withLock(() => transport(`${config.issuer}/token`, body))
  } catch (error) {
    // `withLock` never calls `transport` unless it actually holds the
    // cross-tab lock (`session/refreshLock.ts`'s own fail-safe guarantee)
    // — so this branch covers both "coordination itself could not be
    // established" (`RefreshLockUnavailableError`: unsupported browser,
    // timed-out wait, or a lock-manager failure — `transport` was never
    // called) and "the locked network call itself failed." Both resolve
    // to the same existing `network-error` outcome — callers already
    // treat any non-`success` refresh outcome identically by falling back
    // to `prompt=none` (`protocol/bootstrap.ts`), so no new outcome kind
    // is needed — only a clearer message for the coordination case.
    return {
      outcome: 'network-error',
      message:
        error instanceof RefreshLockUnavailableError
          ? 'No pudimos coordinar la renovación de tu sesión entre pestañas.'
          : 'No pudimos renovar tu sesión.',
    }
  }

  if (isSuccessStatus(response.status)) {
    return { outcome: 'success', token: response.body as WebTokenResponse }
  }
  return { outcome: 'oauth-error', error: response.body as OAuthErrorResponse }
}

/**
 * `grant_type=refresh_token`. Sends only `grant_type` and `client_id` —
 * never a `refresh_token` field, since the web client never has one to
 * send: it lives exclusively in the HttpOnly provider cookie, which this
 * module never reads (`document.cookie` is never touched) and never
 * claims to know the presence of. A 401/`invalid_grant` response here is a
 * normal, expected outcome (no cookie, expired, or already rotated) —
 * callers decide what to do next (e.g. fall back to `prompt=none`, see
 * `protocol/bootstrap.ts`).
 *
 * The actual HTTP call is serialized across browser tabs by
 * `session/refreshLock.ts` (`withLock`, injectable for tests). That
 * module is fail-safe, not fail-open: if cross-tab coordination cannot
 * be established, `withLock` rejects with `RefreshLockUnavailableError`
 * and `transport` is never invoked unlocked — see that module's own doc
 * comment for why reuse-detection revocation makes this required, not
 * just an optimization.
 */
export function refreshAccessToken(
  transport: TokenTransport = defaultTokenTransport,
  withLock: WithRefreshLock = withRefreshLock,
): Promise<TokenResult> {
  inFlightRefresh ??= performRefresh(transport, withLock).finally(() => {
    inFlightRefresh = null
  })
  return inFlightRefresh
}
