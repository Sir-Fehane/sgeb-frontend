import axios from 'axios'

import { getOidcConfig } from '@/features/oidc-client/config/oidcConfig'
import type { OAuthErrorResponse } from '@/features/oidc-client/types/protocol'
import type { OidcRole, UserInfo } from '@/features/oidc-client/types/userInfo'

/**
 * Typed transport for `GET /userinfo` — a protocol endpoint (no SGEB/SSO
 * envelope), authenticated with the access token as a Bearer header, never
 * a cookie. Axios per CLAUDE.md, configured with `validateStatus` so a 401
 * `ErrorOAuth` body can be read directly.
 */
export interface UserInfoHttpResponse {
  status: number
  body: unknown
}

export type UserInfoTransport = (
  endpoint: string,
  accessToken: string,
) => Promise<UserInfoHttpResponse>

const defaultUserInfoTransport: UserInfoTransport = async (endpoint, accessToken) => {
  const response = await axios.get(endpoint, {
    headers: { Authorization: `Bearer ${accessToken}` },
    validateStatus: () => true,
  })
  return { status: response.status, body: response.data }
}

export type UserInfoResult =
  | { outcome: 'success'; user: UserInfo }
  | { outcome: 'oauth-error'; error: OAuthErrorResponse }
  | { outcome: 'network-error'; message: string }
  | { outcome: 'invalid-response'; message: string }

const VALID_ROLES: ReadonlySet<OidcRole> = new Set(['admin', 'capitan', 'mesero'])

type ParsedUserInfo = { valid: true; user: UserInfo } | { valid: false }

/**
 * Narrows the raw JSON body to exactly the documented `UserInfo` fields.
 * Anything not in the documented set (banking data, an internal numeric
 * ID, a permissions array, ...) is never read, even if the provider ever
 * sent it.
 *
 * `rol` is optional per `openapi-sso.yaml` (no `required` entry), so an
 * absent/`null` `rol` is a legitimate response and parses to `{ valid:
 * true }` with no `rol` field. A `rol` that IS present but outside the
 * documented enum is a different, more serious case — a contract
 * violation or corrupted/tampered response, not a legitimate absence —
 * and must not be silently downgraded to "no role" and allowed through:
 * that would let a malformed 200 response still promote the session to
 * `authenticated`, indistinguishable from a genuine role-less identity.
 * Parsing fails (`{ valid: false }`) instead, so the caller can refuse to
 * authenticate from it.
 */
function parseUserInfo(body: unknown): ParsedUserInfo {
  const raw = (body ?? {}) as Record<string, unknown>

  let rol: OidcRole | undefined
  if (raw.rol !== undefined && raw.rol !== null) {
    if (typeof raw.rol === 'string' && VALID_ROLES.has(raw.rol as OidcRole)) {
      rol = raw.rol as OidcRole
    } else {
      return { valid: false }
    }
  }

  return {
    valid: true,
    user: {
      sub: typeof raw.sub === 'string' ? raw.sub : '',
      ...(typeof raw.name === 'string' ? { name: raw.name } : {}),
      ...(typeof raw.given_name === 'string' ? { given_name: raw.given_name } : {}),
      ...(typeof raw.family_name === 'string' ? { family_name: raw.family_name } : {}),
      ...(typeof raw.email === 'string' ? { email: raw.email } : {}),
      ...(typeof raw.email_verified === 'boolean'
        ? { email_verified: raw.email_verified }
        : {}),
      ...(rol ? { rol } : {}),
    },
  }
}

/**
 * `GET /userinfo`. Never runs merely by importing this module — only when
 * explicitly called by the post-callback orchestration.
 */
export async function fetchUserInfo(
  accessToken: string,
  transport: UserInfoTransport = defaultUserInfoTransport,
): Promise<UserInfoResult> {
  const config = getOidcConfig()

  let response: UserInfoHttpResponse
  try {
    response = await transport(`${config.issuer}/userinfo`, accessToken)
  } catch {
    return { outcome: 'network-error', message: 'No pudimos cargar tu perfil.' }
  }

  if (response.status >= 200 && response.status < 300) {
    const parsed = parseUserInfo(response.body)
    if (!parsed.valid) {
      return {
        outcome: 'invalid-response',
        message: 'No pudimos verificar tu perfil. Vuelve a intentarlo.',
      }
    }
    return { outcome: 'success', user: parsed.user }
  }
  return { outcome: 'oauth-error', error: response.body as OAuthErrorResponse }
}
