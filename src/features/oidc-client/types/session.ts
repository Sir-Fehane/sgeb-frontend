import type { UserInfo } from '@/features/oidc-client/types/userInfo'

/**
 * Minimum typed client-side session model for this foundation. Deliberately
 * has no `secondsUntilExpiry`-style derived timers or auto-refresh
 * scheduling — those belong to a later, live-integration branch.
 */
export type OidcSessionStatus =
  'idle' | 'authenticating' | 'authenticated' | 'anonymous' | 'error'

export interface OidcAuthenticatedSession {
  status: 'authenticated'
  accessToken: string
  /** Epoch milliseconds, derived from `expires_in` at the moment the token was issued. */
  accessTokenExpiresAt: number
  /** Present only when the provider returned one (`openid` scope). Opaque — see `client/tokenClient.ts`. */
  idToken?: string
  /** Effective granted scope, as returned by the token endpoint. */
  scope?: string
  user: UserInfo
}

export interface OidcIdleSession {
  status: 'idle'
}

export interface OidcAuthenticatingSession {
  status: 'authenticating'
}

export interface OidcAnonymousSession {
  status: 'anonymous'
}

export interface OidcErrorSession {
  status: 'error'
  /** Safe, user-facing message only — never a raw provider `error_description` or `sso_code`. */
  message: string
}

export type OidcSessionState =
  | OidcIdleSession
  | OidcAuthenticatingSession
  | OidcAuthenticatedSession
  | OidcAnonymousSession
  | OidcErrorSession
