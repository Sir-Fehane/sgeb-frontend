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
  /**
   * `true` only when this transaction was started with `prompt=none` (a
   * cold-start silent-restore attempt — see `protocol/bootstrap.ts`).
   * Omitted (never `false`) for a normal, visible authorization request —
   * see `storage/authorizationTransaction.ts`'s field-by-field rebuild.
   * The callback path (`protocol/callback.ts`) reads this to decide
   * whether a `login_required` response should silently retry with a
   * normal visible flow instead of showing an error.
   */
  silent?: boolean
}
