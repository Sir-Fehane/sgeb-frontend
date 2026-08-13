import type { AxiosError } from 'axios'

import type { ApiEnvelope } from '@/shared/types/api'

/**
 * Thin, typed helper around the shared `{ result, data }` envelope used by
 * both the SGEB and SSO APIs. This intentionally does nothing beyond
 * narrowing the shape — there is no code→message translation table here:
 * `result.message` is already the approved, user-facing copy from the
 * server (see docs/FrontendArchitecture.md §4.1).
 */
export function unwrapEnvelope<TData>(envelope: ApiEnvelope<TData>): TData | null {
  return envelope.data
}

/**
 * Narrows an unknown Axios error into the envelope's `result` block, when
 * the server responded with one. Returns `undefined` for network failures
 * or any response that didn't include the expected envelope.
 */
export function getApiResult(error: unknown): ApiEnvelope['result'] | undefined {
  const axiosError = error as AxiosError<ApiEnvelope>
  return axiosError.response?.data?.result
}

/**
 * Lightweight structural check for the `{ result: { code, message }, data }`
 * shape, used by `shared/api/sgebClient.ts` to tell an actual SGEB envelope
 * apart from a malformed/non-envelope HTTP body (an HTML error page, a
 * proxy's own JSON error shape, etc. — docs/FrontendArchitecture.md §19).
 * Deliberately not a Zod schema: this only needs to gate "is it safe to
 * read `result.code`," not validate the full contract.
 */
export function isApiEnvelope(value: unknown): value is ApiEnvelope {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('result' in value) ||
    !('data' in value)
  ) {
    return false
  }
  const result = (value as { result: unknown }).result
  if (typeof result !== 'object' || result === null) {
    return false
  }
  const { code, message } = result as Record<string, unknown>
  return typeof code === 'string' && typeof message === 'string'
}
