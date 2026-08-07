import { getOidcConfig, type OidcConfig } from '@/features/oidc-client/config/oidcConfig'
import { resetOidcSession } from '@/features/oidc-client/session/sessionStore'

/**
 * `GET /logout` — destroys the provider's SSO session cookie and revokes
 * its refresh-token chain ("sign out everywhere"). Full-page navigation
 * only, never `fetch` — the provider responds with a redirect or an HTML
 * screen, not JSON.
 *
 * `POST /token/revoke` (sign out of only this application) is intentionally
 * NOT implemented here: it requires a `token` field, and for the web
 * client the refresh token lives exclusively in an HttpOnly cookie this
 * code cannot read. Sending the access token in its place would misrepresent
 * what's being revoked (`docs/sso/openapi-sso.yaml` documents `token`/
 * `token_type_hint` generically, without a web-specific carve-out) — this
 * is a genuine, unresolved contract gap, not something to paper over with
 * a guessed request. See the README's "Logout and revoke" section.
 */
export interface BuildLogoutUrlParams {
  /** `id_token` of the session being closed — identifies the user to the provider without exposing their UUID in the URL. Never rendered in any UI. */
  idTokenHint?: string
  state?: string
}

export function buildLogoutUrl(
  config: OidcConfig,
  params: BuildLogoutUrlParams = {},
): string {
  const url = new URL('/logout', config.issuer)
  url.searchParams.set('post_logout_redirect_uri', config.postLogoutRedirectUri)

  if (params.idTokenHint) {
    url.searchParams.set('id_token_hint', params.idTokenHint)
  }
  if (params.state) {
    url.searchParams.set('state', params.state)
  }

  return url.toString()
}

export type LogoutNavigate = (url: string) => void

const defaultNavigate: LogoutNavigate = (url) => {
  window.location.assign(url)
}

/**
 * Clears the in-memory session, then navigates to the full-page provider
 * logout URL. Returns the constructed URL so tests can assert on it
 * without triggering real navigation.
 */
export function logout(
  params: BuildLogoutUrlParams = {},
  navigate: LogoutNavigate = defaultNavigate,
): string {
  const config = getOidcConfig()
  const url = buildLogoutUrl(config, params)

  resetOidcSession()
  navigate(url)

  return url
}
