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
