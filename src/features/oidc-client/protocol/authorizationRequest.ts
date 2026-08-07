import { getOidcConfig, type OidcConfig } from '@/features/oidc-client/config/oidcConfig'
import {
  generateNonce,
  generatePkcePair,
  generateState,
} from '@/features/oidc-client/protocol/pkce'
import {
  OIDC_DEFAULT_RETURN_TO,
  isSafeReturnTo,
  saveAuthorizationTransaction,
} from '@/features/oidc-client/storage/authorizationTransaction'
import type { OidcPrompt } from '@/features/oidc-client/types/protocol'

export interface BeginAuthorizationOptions {
  /** App path to return to after a successful exchange. Falls back to `/panel` when missing or unsafe. */
  returnTo?: string
  /**
   * `none` — silent renewal; the provider replies `login_required` with no
   * UI if there's no live SSO session (see the "Cold-start prompt=none"
   * README section). `login` — forces re-authentication even with a live
   * session. Omit for the normal, first-time authorization request.
   */
  prompt?: OidcPrompt
  /** Pre-fills the provider's email field (S1/S2) — never a credential. */
  loginHint?: string
}

/**
 * Full-page navigation is the only supported strategy — no iframe, no
 * popup, per `docs/sso/openapi-sso.yaml`'s own explicit warning that an
 * embedded view can read what the user types, defeating the point of the
 * flow. Injectable so unit tests never replace `window.location`.
 */
export type AuthorizationNavigate = (url: string) => void

const defaultNavigate: AuthorizationNavigate = (url) => {
  window.location.assign(url)
}

export interface BuildAuthorizeUrlParams {
  state: string
  nonce: string
  codeChallenge: string
  prompt?: OidcPrompt
  loginHint?: string
}

/**
 * Constructs the `GET /authorize` URL with exactly the required parameters
 * (`response_type=code`, `client_id`, `redirect_uri`, `scope`, `state`,
 * `nonce`, `code_challenge`, `code_challenge_method=S256`) plus the two
 * documented optional ones. Pure and side-effect-free — safe to call from
 * a test without triggering navigation.
 */
export function buildAuthorizeUrl(
  config: OidcConfig,
  params: BuildAuthorizeUrlParams,
): string {
  const url = new URL('/authorize', config.issuer)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', config.clientId)
  url.searchParams.set('redirect_uri', config.redirectUri)
  url.searchParams.set('scope', config.scope)
  url.searchParams.set('state', params.state)
  url.searchParams.set('nonce', params.nonce)
  url.searchParams.set('code_challenge', params.codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')

  if (params.prompt) {
    url.searchParams.set('prompt', params.prompt)
  }
  if (params.loginHint) {
    url.searchParams.set('login_hint', params.loginHint)
  }

  return url.toString()
}

/**
 * Initiates the Authorization Code + PKCE flow: generates `state`/`nonce`/
 * PKCE, persists the transient transaction, builds the `/authorize` URL,
 * and hands it to `navigate` (defaulting to a real full-page redirect).
 * Never runs any of this merely by importing the module — only when
 * actually called. Returns the constructed URL so callers/tests can
 * inspect exactly what was navigated to.
 */
export async function beginAuthorization(
  options: BeginAuthorizationOptions = {},
  navigate: AuthorizationNavigate = defaultNavigate,
): Promise<string> {
  const config = getOidcConfig()
  const state = generateState()
  const nonce = generateNonce()
  const { codeVerifier, codeChallenge } = await generatePkcePair()
  const returnTo =
    options.returnTo && isSafeReturnTo(options.returnTo)
      ? options.returnTo
      : OIDC_DEFAULT_RETURN_TO

  saveAuthorizationTransaction({
    state,
    nonce,
    codeVerifier,
    redirectUri: config.redirectUri,
    returnTo,
  })

  const url = buildAuthorizeUrl(config, {
    state,
    nonce,
    codeChallenge,
    ...(options.prompt ? { prompt: options.prompt } : {}),
    ...(options.loginHint ? { loginHint: options.loginHint } : {}),
  })

  navigate(url)

  return url
}
