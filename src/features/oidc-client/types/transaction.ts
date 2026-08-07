/**
 * The transient authorization-request data that must survive the full-page
 * redirect to the provider and back. Lives only in sessionStorage (see
 * `storage/authorizationTransaction.ts`) — never the access token, id
 * token, refresh token, or UserInfo.
 */
export interface OidcAuthorizationTransaction {
  state: string
  nonce: string
  codeVerifier: string
  redirectUri: string
  /** Validated same-origin app path to return to after a successful exchange. */
  returnTo: string
}
