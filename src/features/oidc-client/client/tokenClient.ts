import axios from 'axios'

import { getOidcConfig } from '@/features/oidc-client/config/oidcConfig'
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
 * This is same-tab only. The provider rotates the refresh cookie on every
 * use, so two browser tabs refreshing concurrently can each present an
 * already-rotated cookie and trigger SSO-1007 (reuse detected, full
 * session revoked) — this module does not attempt to prevent that. See
 * the README's "Refresh coordination" section: cross-tab serialization
 * (a `BroadcastChannel`/lock-based coordinator) is a documented gap, not
 * implemented here.
 */
let inFlightRefresh: Promise<TokenResult> | null = null

async function performRefresh(transport: TokenTransport): Promise<TokenResult> {
  const config = getOidcConfig()
  const body = new URLSearchParams()
  body.set('grant_type', 'refresh_token')
  body.set('client_id', config.clientId)

  let response: TokenHttpResponse
  try {
    response = await transport(`${config.issuer}/token`, body)
  } catch {
    return {
      outcome: 'network-error',
      message: 'No pudimos renovar tu sesión.',
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
 * callers decide what to do next (e.g. fall back to `prompt=none`).
 */
export function refreshAccessToken(
  transport: TokenTransport = defaultTokenTransport,
): Promise<TokenResult> {
  inFlightRefresh ??= performRefresh(transport).finally(() => {
    inFlightRefresh = null
  })
  return inFlightRefresh
}
