/**
 * Protocol-facing types for the OAuth 2.1 + OIDC endpoints documented in
 * `docs/sso/openapi-sso.yaml` v2.2.0 (the `Protocolo`-tagged paths). These
 * respond in the exact OAuth/OIDC spec shape — no `{ result, data }` SGEB
 * envelope — per the OpenAPI document's own "Excepción al envelope
 * estándar" note.
 */

/**
 * The web-specific shape of `RespuestaToken` (`POST /token`'s response).
 * The OpenAPI schema also documents `refresh_token`, but that field is
 * iOS-only — for the web client the provider delivers the refresh token as
 * an HttpOnly cookie instead (see `RespuestaToken.refresh_token`'s own
 * description). `refresh_token` is intentionally NOT a field of this type:
 * it must never be required, stored, or exposed through session state, even
 * if the raw JSON response happens to include one.
 */
export interface WebTokenResponse {
  access_token: string
  token_type: 'Bearer'
  /** Seconds until the access token expires (typically ~900, per the spec). */
  expires_in: number
  /** Present only when the `openid` scope was granted. */
  id_token?: string
  /** Effective granted scope — may be narrower than requested. */
  scope?: string
}

/** `error` enum from `ErrorOAuth` (`docs/sso/openapi-sso.yaml`). */
export type OAuthErrorCode =
  | 'invalid_request'
  | 'invalid_client'
  | 'invalid_grant'
  | 'unauthorized_client'
  | 'unsupported_grant_type'
  | 'invalid_scope'
  | 'access_denied'
  | 'login_required'
  | 'server_error'
  | 'temporarily_unavailable'

/**
 * `ErrorOAuth` — the standard-shaped error body/redirect-query used by
 * every protocol endpoint. `sso_code` is Mediocres Inc.'s own extension for
 * tracing into the SSO error dictionary; `error_description` and
 * `sso_code` must never be rendered to the user directly — see
 * `utils/safeOAuthErrorMessage.ts` for the safe local mapping.
 */
export interface OAuthErrorResponse {
  error: OAuthErrorCode
  error_description?: string
  error_uri?: string
  /** Present only on errors returned by redirection (carries the original `state`). */
  state?: string
  sso_code?: string
}

/** `response_type` supported by `GET /authorize` — only `code` (Authorization Code + PKCE). */
export type OidcResponseType = 'code'

/** `code_challenge_method` supported by `GET /authorize` — only `S256` (the `plain` method is rejected server-side). */
export type CodeChallengeMethod = 'S256'

/** `prompt` values documented for `GET /authorize`. */
export type OidcPrompt = 'none' | 'login'
