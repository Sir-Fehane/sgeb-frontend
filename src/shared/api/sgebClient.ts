import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'

import { refreshAccessToken as defaultRefreshAccessToken } from '@/features/oidc-client/client/tokenClient'
import {
  applyRefreshedAccessToken as defaultApplyRefreshedAccessToken,
  getOidcAccessToken as defaultGetOidcAccessToken,
} from '@/features/oidc-client/session/sessionStore'
import type { TokenResult } from '@/features/oidc-client/client/tokenClient'
import { isApiEnvelope } from '@/shared/api/apiEnvelope'
import { SgebApplicationError, SgebNetworkError } from '@/shared/api/sgebApiError'
import { SGEB_CODE } from '@/shared/api/sgebCodes'
import { env } from '@/shared/config/env'
import type { ApiEnvelope } from '@/shared/types/api'

interface RefreshedTokenPayload {
  accessToken: string
  accessTokenExpiresAt: number
  idToken?: string
  scope?: string
}

/** Marks a request config that has already been replayed once after a SGEB-1002 refresh, so a second SGEB-1002 on the same call never triggers another refresh. */
interface SgebRetryableConfig extends InternalAxiosRequestConfig {
  _sgebRetried?: boolean
}

/**
 * The SGEB-1002 recovery flow's dependencies on the OIDC session
 * architecture, isolated behind this narrow interface so tests can inject
 * fakes instead of mocking modules — mirrors the same DI style already used
 * by `features/oidc-client/client/tokenClient.ts`.
 */
export interface SgebAuthDependencies {
  getAccessToken: () => string | undefined
  refresh: () => Promise<TokenResult>
  applyRefreshedAccessToken: (payload: RefreshedTokenPayload) => boolean
}

const defaultDeps: SgebAuthDependencies = {
  getAccessToken: defaultGetOidcAccessToken,
  refresh: defaultRefreshAccessToken,
  applyRefreshedAccessToken: defaultApplyRefreshedAccessToken,
}

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
 * Wires the authenticated SGEB transport behavior onto an Axios instance:
 *
 * - Request interceptor: attaches `Authorization: Bearer <token>` resolved
 *   fresh at request time via `deps.getAccessToken()` — never a token
 *   captured once when the instance was created. Sends no header at all
 *   when there is no authenticated session (deterministic, no invented
 *   token).
 * - Response interceptor: on an explicit `SGEB-1002` (expired token)
 *   application error, attempts exactly one refresh through the existing
 *   OIDC refresh primitive (same-tab singleflight + cross-tab lock both
 *   live there — this never reimplements that coordination), applies the
 *   result to the existing session store, and retries the original
 *   request exactly once. Any other outcome — refresh failure, a second
 *   SGEB-1002 on an already-retried request, `SGEB-1003`/`SGEB-1004`, any
 *   other HTTP/SGEB error, or a non-envelope/network failure — normalizes
 *   into `SgebApplicationError`/`SgebNetworkError`
 *   (`shared/api/sgebApiError.ts`) without retrying. Cancellation
 *   (`AbortSignal`) propagates unchanged.
 *
 * Exported (rather than only the bound `sgebClient` below) so tests can
 * attach this to a throwaway instance with fake dependencies and a custom
 * adapter, instead of mocking modules.
 */
export function attachSgebAuthInterceptors(
  instance: AxiosInstance,
  deps: SgebAuthDependencies = defaultDeps,
): void {
  instance.interceptors.request.use((config) => {
    const token = deps.getAccessToken()
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`)
    } else {
      config.headers.delete('Authorization')
    }
    return config
  })

  instance.interceptors.response.use(
    (response) => response,
    async (error: unknown): Promise<AxiosResponse> => {
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

      const { result } = responseData
      const httpStatus = error.response.status
      const config = error.config as SgebRetryableConfig | undefined

      if (result.code === SGEB_CODE.TOKEN_EXPIRED && config && !config._sgebRetried) {
        const refreshResult = await deps.refresh()
        if (refreshResult.outcome === 'success') {
          const { token } = refreshResult
          const applied = deps.applyRefreshedAccessToken({
            accessToken: token.access_token,
            accessTokenExpiresAt: Date.now() + token.expires_in * 1000,
            ...(token.id_token ? { idToken: token.id_token } : {}),
            ...(token.scope ? { scope: token.scope } : {}),
          })
          if (applied) {
            config._sgebRetried = true
            return instance.request(config)
          }
        }
        // Refresh failed, or there was no live authenticated session to
        // apply it to (e.g. a concurrent logout) — fall through and
        // surface the original SGEB-1002 as a normalized, deterministic
        // authentication failure rather than retrying further.
      }

      throw new SgebApplicationError(httpStatus, result)
    },
  )
}

/**
 * Axios instance for the authenticated SGEB business API (docs/api/).
 * Foundation for every future private SGEB endpoint — see
 * `attachSgebAuthInterceptors` above for what it does on top of plain
 * Axios. Feature modules should prefer `requestSgeb`/`requestSgebBinary`
 * (below) over calling this instance directly, so they never depend on
 * `AxiosError` or `response.data` shape.
 *
 * Deliberately no instance-level `Content-Type` default. Axios's own
 * `transformRequest` already sets `application/json` for a plain object
 * body when no Content-Type is present — the previous hardcoded default
 * was redundant for that case and actively harmful for a `FormData` body
 * (e.g. `POST /eventos/{id}/comanda`'s multipart upload): with a
 * `Content-Type: application/json` header already present,
 * axios@1.19.0's `transformRequest` runs `FormData` through
 * `hasJSONContentType ? JSON.stringify(formDataToJSON(data)) : data` —
 * the forced JSON content type flips it to the `JSON.stringify` branch,
 * silently discarding the binary and never letting the browser generate
 * the `multipart/form-data; boundary=...` header. Removing the default
 * lets a `FormData` body pass through untouched. See
 * `sgebClient.test.ts`'s "FormData request bodies" suite for the
 * regression coverage proving both halves of this still work.
 */
export const sgebClient = axios.create({
  baseURL: env.VITE_SGEB_API_URL,
})

attachSgebAuthInterceptors(sgebClient)

export interface SgebRequestConfig {
  url: string
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  params?: Record<string, unknown>
  /**
   * A plain object is JSON-serialized as before. A `FormData` instance
   * (e.g. a multipart upload) is sent through unchanged — never
   * JSON.stringify it or set its `Content-Type` manually; the
   * browser/XHR adapter must generate the `multipart/form-data;
   * boundary=...` header itself, which only it can compute.
   */
  data?: unknown
  signal?: AbortSignal
}

/**
 * The smallest generic call surface for future feature modules: a typed
 * request against the authenticated SGEB API that resolves with the full
 * `{ result, data }` envelope — never just `data` (docs/decisions.md
 * ADR-005: `result.code` is load-bearing, e.g. `SGEB-0004` partial
 * success) — and never leaks an `AxiosError`. Failures reject with
 * `SgebApplicationError` or `SgebNetworkError`
 * (`shared/api/sgebApiError.ts`), or propagate the original cancellation
 * error unchanged when `signal` was aborted. Bearer attachment and the
 * SGEB-1002 refresh-and-retry flow are handled transparently by the
 * interceptors above; callers never see either concern.
 */
export async function requestSgeb<TData>(
  config: SgebRequestConfig,
): Promise<ApiEnvelope<TData>> {
  const response = await sgebClient.request<ApiEnvelope<TData>>(config)
  return response.data
}

export interface SgebBinaryRequestConfig {
  url: string
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  params?: Record<string, unknown>
  signal?: AbortSignal
}

/**
 * The binary counterpart to `requestSgeb`, for an endpoint that responds
 * with a file body instead of the `{ result, data }` envelope (e.g. `GET
 * /eventos/{id}/comanda/archivo`). Reuses the exact same `sgebClient`
 * instance — same Bearer attachment, same SGEB-1002 refresh-and-retry,
 * same cancellation propagation — only the response handling differs:
 * `responseType: 'blob'` so the binary body is never run through
 * `JSON.parse` (axios's default text-mode reading of a `responseType`-less
 * request would otherwise corrupt binary bytes before any parsing even
 * happens), and the return value is the raw `Blob`, never wrapped in
 * `ApiEnvelope<TData>` — there is no envelope on a binary response to
 * unwrap.
 *
 * Known limitation, deliberately not solved here: if the server responds
 * with a SGEB error envelope (e.g. `SGEB-1004`) for a request made with
 * `responseType: 'blob'`, `error.response.data` arrives as a `Blob`, not
 * parsed JSON — `isApiEnvelope` (`apiEnvelope.ts`) returns `false` for a
 * `Blob`, so `attachSgebAuthInterceptors`'s response interceptor falls
 * back to a generic `SgebNetworkError` instead of the precise
 * `SgebApplicationError`/code. The error still surfaces as a safe,
 * normalized frontend error (never a raw `AxiosError`, never
 * `technical_message`) — it is just less specific than an ordinary JSON
 * request's error. Parsing a Blob error body back into the envelope would
 * require an async re-read inside the interceptor for every request, not
 * only binary ones; out of scope unless a real caller needs to distinguish
 * e.g. `SGEB-1004` from a network failure on this specific path.
 */
export async function requestSgebBinary(config: SgebBinaryRequestConfig): Promise<Blob> {
  const response = await sgebClient.request<Blob>({ ...config, responseType: 'blob' })
  return response.data
}
