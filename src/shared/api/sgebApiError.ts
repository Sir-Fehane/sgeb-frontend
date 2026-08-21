import { SGEB_CODE } from '@/shared/api/sgebCodes'
import type { ApiResult } from '@/shared/types/api'

/**
 * Normalized error model shared by both SGEB transports —
 * `shared/api/sgebClient.ts` (authenticated) and
 * `shared/api/publicClient.ts` (anonymous `/publico/*`) — since both answer
 * with the identical `{ result, data }` envelope. Feature/UI layers depend
 * on this, never on `AxiosError` directly (docs/decisions.md ADR-005).
 *
 * Two kinds only, deliberately not a larger hierarchy (CLAUDE.md's "boring,
 * dependable transport boundary"):
 *
 * - `SgebApplicationError` — the SGEB server answered with a valid
 *   `{ result, data }` envelope describing a failure (`result.code` is not
 *   a success code). `message` is `result.message`, already the approved,
 *   user-facing copy — never `result.technical_message`, which stays
 *   reachable only via `.result.technical_message` for internal
 *   debugging/support and must never be rendered.
 * - `SgebNetworkError` — no usable SGEB envelope exists: a transport-level
 *   failure (offline, DNS, CORS, timeout) or an HTTP response that didn't
 *   parse as the documented envelope. Never fabricates a SGEB code for
 *   these (see docs/FrontendArchitecture.md §18-19).
 *
 * Request cancellation (`AbortSignal`) is NOT represented here — it
 * propagates as the original cancellation error, unwrapped, so callers can
 * keep distinguishing it from both kinds above.
 */
export class SgebApplicationError extends Error {
  readonly kind = 'sgeb-application-error' as const
  readonly httpStatus: number
  readonly code: string
  readonly result: ApiResult

  constructor(httpStatus: number, result: ApiResult) {
    super(result.message)
    this.name = 'SgebApplicationError'
    this.httpStatus = httpStatus
    this.code = result.code
    this.result = result
  }
}

export class SgebNetworkError extends Error {
  readonly kind = 'network-error' as const
  /** Present when an HTTP response was received but didn't parse as a SGEB envelope; absent for a pure transport failure. */
  readonly httpStatus: number | undefined

  constructor(message: string, httpStatus?: number) {
    super(message)
    this.name = 'SgebNetworkError'
    this.httpStatus = httpStatus
  }
}

export type SgebError = SgebApplicationError | SgebNetworkError

export function isSgebApplicationError(error: unknown): error is SgebApplicationError {
  return error instanceof SgebApplicationError
}

export function isSgebNetworkError(error: unknown): error is SgebNetworkError {
  return error instanceof SgebNetworkError
}

/**
 * `true` for a `SgebApplicationError` carrying `SGEB-1002` (expired token)
 * — the one `SgebApplicationError` shape a mutation caller may need to
 * distinguish from every other business/validation failure. For a write
 * request, `shared/api/sgebClient.ts`'s SGEB-1002 recovery never triggers
 * its own full-page silent-auth redirect (see `isWriteRequestConfig` there)
 * precisely so the caller stays mounted and can react to this instead: show
 * a session-expired message that does not misrepresent the write as having
 * succeeded, and offer an explicit, user-initiated re-authentication
 * action (e.g. `beginAuthorization`) rather than one triggered silently out
 * from under an unsaved form. See `EventCreatePage` for the reference
 * usage.
 */
export function isSessionExpiredError(error: unknown): error is SgebApplicationError {
  return isSgebApplicationError(error) && error.code === SGEB_CODE.TOKEN_EXPIRED
}
