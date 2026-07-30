/**
 * Cross-cutting API contract types shared by every backend this frontend
 * talks to (SGEB and SSO both use the identical envelope, per
 * docs/api/documentacion-endpoints.txt and docs/sso/openapi-sso (1).yaml).
 *
 * Domain-specific response shapes (Evento, Usuario, Orden, Identidad, ...)
 * belong inside the feature that owns them, not here — see
 * docs/FrontendArchitecture.md §13.
 */

/** `result` block present on every SGEB/SSO response, success or error. */
export interface ApiResult {
  /** Business code, e.g. "SGEB-0000" or "SSO-1001". Not an HTTP status. */
  code: string
  /** User-facing message. Safe to render as-is. */
  message: string
  /** Support/debugging detail. Never render this to the end user. */
  technical_message?: string
}

/** The single envelope shape every SGEB/SSO endpoint responds with. */
export interface ApiEnvelope<TData = unknown> {
  result: ApiResult
  data: TData | null
}

/** Shared pagination query parameters used across list endpoints. */
export interface PaginationParams {
  page?: number
  page_size?: number
}
