/**
 * Mirrors `UserInfo` from `docs/sso/openapi-sso.yaml` v2.2.0's
 * `GET /userinfo` (protocol endpoint — no SGEB/SSO envelope). Only the
 * documented fields are modeled: no internal numeric user ID, permissions
 * array, avatar, phone, CLABE, organization, or tenant — none of those are
 * part of this contract.
 */

/** The three role names `openapi-sso.yaml` documents for the `rol` claim. */
export type OidcRole = 'admin' | 'capitan' | 'mesero'

export interface UserInfo {
  /** `uuid_usuario` — an opaque, stable subject identifier. Never parsed. */
  sub: string
  name?: string
  given_name?: string
  family_name?: string
  email?: string
  email_verified?: boolean
  rol?: OidcRole
}
