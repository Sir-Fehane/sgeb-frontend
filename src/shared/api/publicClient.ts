import axios, { type AxiosInstance, type AxiosResponse } from 'axios'

import { isApiEnvelope } from '@/shared/api/apiEnvelope'
import { SgebApplicationError, SgebNetworkError } from '@/shared/api/sgebApiError'
import { env } from '@/shared/config/env'
import type { ApiEnvelope } from '@/shared/types/api'

function toSgebNetworkError(error: unknown): SgebNetworkError {
  if (axios.isAxiosError(error)) {
    if (error.response) {
      return new SgebNetworkError(
        'No pudimos interpretar la respuesta del servidor.',
        error.response.status,
      )
    }
    return new SgebNetworkError(
      'No pudimos comunicarnos con el servidor. Verifica tu conexión.',
    )
  }
  return new SgebNetworkError('Ocurrió un error de red inesperado.')
}

/**
 * Same envelope-error normalization as `shared/api/sgebClient.ts`'s response
 * interceptor, deliberately without any of that transport's auth concerns
 * (no Bearer attachment, no SGEB-1002 refresh-and-retry, no silent-auth
 * fallback) — `/publico/*` never expires a session because it never has
 * one. Reuses `SgebApplicationError`/`SgebNetworkError`
 * (`shared/api/sgebApiError.ts`) rather than a second error hierarchy: both
 * transports answer with the identical `{ result, data }` envelope
 * (docs/decisions.md ADR-005), so the same normalized shape applies here
 * unchanged. Exported separately (rather than only attached to the
 * module-level `publicClient` below) so tests can attach it to a
 * throwaway instance with a scripted adapter — same pattern as
 * `shared/api/sgebClient.ts`'s `attachSgebAuthInterceptors`.
 */
export function attachPublicClientInterceptors(instance: AxiosInstance): void {
  instance.interceptors.response.use(
    (response) => response,
    (error: unknown): Promise<AxiosResponse> => {
      if (axios.isCancel(error)) {
        throw error
      }
      if (!axios.isAxiosError(error) || !error.response) {
        throw toSgebNetworkError(error)
      }

      const responseData: unknown = error.response.data
      if (!isApiEnvelope(responseData)) {
        throw toSgebNetworkError(error)
      }

      throw new SgebApplicationError(error.response.status, responseData.result)
    },
  )
}

/**
 * Axios instance for the anonymous comensal (`/publico/*`) endpoints of the
 * SGEB API — docs/FrontendArchitecture.md §2.2 and §12.
 *
 * This client must NEVER attach an Authorization header or read from the
 * authenticated session store. It is the only HTTP client the comensal
 * feature is allowed to import.
 */
export const publicClient = axios.create({
  baseURL: env.VITE_SGEB_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

attachPublicClientInterceptors(publicClient)

export interface PublicRequestConfig {
  url: string
  method?: 'GET' | 'POST'
  data?: unknown
  signal?: AbortSignal
}

/**
 * The public-transport counterpart to `shared/api/sgebClient.ts`'s
 * `requestSgeb`: resolves with the full `{ result, data }` envelope, never
 * leaks an `AxiosError`, and normalizes every failure into
 * `SgebApplicationError`/`SgebNetworkError` via the interceptor above.
 */
export async function requestPublic<TData>(
  config: PublicRequestConfig,
): Promise<ApiEnvelope<TData>> {
  const response = await publicClient.request<ApiEnvelope<TData>>(config)
  return response.data
}
