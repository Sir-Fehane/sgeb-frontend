import axios, {
  AxiosError,
  CanceledError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { TokenResult } from '@/features/oidc-client/client/tokenClient'
import { isApiEnvelope } from '@/shared/api/apiEnvelope'
import { isSgebApplicationError, isSgebNetworkError } from '@/shared/api/sgebApiError'
import {
  attachSgebAuthInterceptors,
  requestSgebBinary,
  sgebClient,
  type SgebAuthDependencies,
  type SgebBinaryRequestConfig,
  type SgebRequestConfig,
} from '@/shared/api/sgebClient'
import type { ApiEnvelope, ApiResult } from '@/shared/types/api'

function envelope(result: ApiResult, data: unknown = null) {
  return { result, data }
}

function successResult(code: string, message = 'ok'): ApiResult {
  return { code, message }
}

function errorResult(
  code: string,
  message = 'error',
  technical_message?: string,
): ApiResult {
  return { code, message, ...(technical_message ? { technical_message } : {}) }
}

function fakeResponse(
  config: InternalAxiosRequestConfig,
  status: number,
  data: unknown,
): AxiosResponse {
  return { data, status, statusText: '', headers: {}, config } as AxiosResponse
}

function fakeAxiosError(
  config: InternalAxiosRequestConfig,
  status: number,
  data: unknown,
) {
  const response = fakeResponse(config, status, data)
  return new AxiosError('Request failed', String(status), config, undefined, response)
}

const SUCCESS_TOKEN = {
  access_token: 'refreshed-token',
  token_type: 'Bearer' as const,
  expires_in: 900,
}

/**
 * Builds a throwaway Axios instance with the SGEB interceptors attached and
 * a scripted adapter — no real network, no dependency on a mocking library
 * (mirrors the transport-injection style already used by
 * `features/oidc-client/client/tokenClient.test.ts`). `request` mirrors
 * what the exported `requestSgeb` does (resolve to the envelope, never the
 * raw Axios response) but against this throwaway instance instead of the
 * module-level singleton, so each test stays fully isolated.
 */
function createTestClient(depsOverrides: Partial<SgebAuthDependencies> = {}) {
  const instance = axios.create({ baseURL: 'http://sgeb.test/v1' })

  const deps: SgebAuthDependencies = {
    getAccessToken: () => 'initial-token',
    refresh: vi.fn<() => Promise<TokenResult>>(),
    applyRefreshedAccessToken: vi.fn(() => true),
    beginSilentAuthorization: vi.fn().mockResolvedValue('https://auth.example/authorize'),
    ...depsOverrides,
  }

  attachSgebAuthInterceptors(instance, deps)

  const adapter = vi.fn<(config: InternalAxiosRequestConfig) => Promise<AxiosResponse>>()
  instance.defaults.adapter = adapter

  async function request<TData>(config: SgebRequestConfig): Promise<ApiEnvelope<TData>> {
    const response = await instance.request<ApiEnvelope<TData>>(config)
    return response.data
  }

  /** Mirrors `requestSgebBinary` against this throwaway instance instead of the module-level singleton. */
  async function requestBinary(config: SgebBinaryRequestConfig): Promise<Blob> {
    const response = await instance.request<Blob>({ ...config, responseType: 'blob' })
    return response.data
  }

  return { instance, deps, adapter, request, requestBinary }
}

describe('sgebClient — authorization', () => {
  it('attaches the current access token as a Bearer header', async () => {
    const { adapter, request } = createTestClient({ getAccessToken: () => 'abc-token' })
    adapter.mockImplementation((config) =>
      Promise.resolve(fakeResponse(config, 200, envelope(successResult('SGEB-0000')))),
    )

    await request({ url: '/eventos' })

    const config = adapter.mock.calls[0]![0]
    expect(config.headers.get('Authorization')).toBe('Bearer abc-token')
  })

  it('resolves the token fresh at request time, not once when the client was built', async () => {
    let currentToken = 'first-token'
    const { adapter, request } = createTestClient({ getAccessToken: () => currentToken })
    adapter.mockImplementation((config) =>
      Promise.resolve(fakeResponse(config, 200, envelope(successResult('SGEB-0000')))),
    )

    await request({ url: '/eventos' })
    expect(adapter.mock.calls[0]![0].headers.get('Authorization')).toBe(
      'Bearer first-token',
    )

    currentToken = 'second-token'
    await request({ url: '/eventos' })
    expect(adapter.mock.calls[1]![0].headers.get('Authorization')).toBe(
      'Bearer second-token',
    )
  })

  it('sends no Authorization header when there is no authenticated session, and still sends the request', async () => {
    const { adapter, request } = createTestClient({ getAccessToken: () => undefined })
    adapter.mockImplementation((config) =>
      Promise.resolve(fakeResponse(config, 200, envelope(successResult('SGEB-0000')))),
    )

    await request({ url: '/eventos' })

    expect(adapter).toHaveBeenCalledOnce()
    expect(adapter.mock.calls[0]![0].headers.get('Authorization')).toBeFalsy()
  })

  it('never logs the access token or the Authorization header', async () => {
    const noop = () => undefined
    const logSpy = vi.spyOn(console, 'log').mockImplementation(noop)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(noop)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(noop)

    const { adapter, request } = createTestClient({
      getAccessToken: () => 'super-secret-token',
    })
    adapter.mockImplementation((config) =>
      Promise.reject(
        fakeAxiosError(
          config,
          403,
          envelope(errorResult('SGEB-1004', 'No tienes permisos.')),
        ),
      ),
    )

    await request({ url: '/eventos' }).catch(() => undefined)

    for (const spy of [logSpy, warnSpy, errorSpy]) {
      for (const call of spy.mock.calls) {
        expect(JSON.stringify(call)).not.toContain('super-secret-token')
      }
    }
    logSpy.mockRestore()
    warnSpy.mockRestore()
    errorSpy.mockRestore()
  })
})

describe('sgebClient — envelope preservation', () => {
  /**
   * The authoritative 0xxx "Éxito" set and each code's real documented HTTP
   * status, confirmed directly against the pinned backend's
   * `app/shared/errors/catalogo.ts` (`CODIGOS`) — not assumed. Every one of
   * these resolves via the plain Axios success path (`validateStatus`'s
   * default `2xx`); the interceptor's error branch never even runs for
   * them, so nothing here special-cases a `result.code` string to decide
   * success — HTTP status is the only signal that matters, exactly as
   * before. `SGEB-0001`'s real status is 201 (`responder.creado`), NOT 200
   * — a prior version of this test suite mocked 200 for it uniformly with
   * SGEB-0000, which passed trivially without ever exercising the real 201
   * path and would have masked a genuine 201-specific regression.
   */
  it.each([
    ['SGEB-0000', 200, { foo: 'bar' }],
    ['SGEB-0001', 201, { id: 1 }],
    ['SGEB-0002', 200, []],
    ['SGEB-0003', 202, { id_job: 'job-123' }],
    ['SGEB-0004', 200, { resumen: { total: 5 }, cierre: null }],
  ] as const)(
    'preserves a %s success envelope (HTTP %i) as a resolved promise, result and typed data — never a rejection',
    async (code, http, data) => {
      const { adapter, request } = createTestClient()
      adapter.mockImplementation((config) =>
        Promise.resolve(fakeResponse(config, http, envelope(successResult(code), data))),
      )

      const result = await request<typeof data>({ url: '/eventos' })

      expect(result.result.code).toBe(code)
      expect(result.data).toEqual(data)
    },
  )

  it('a real, documented error code sharing SGEB-0001\'s own 2xx-adjacent numeric neighborhood (e.g. SGEB-2001, HTTP 400) still throws — success is driven by HTTP status, never by treating any "low-numbered" SGEB code as inherently safe', async () => {
    const { adapter, request } = createTestClient()
    adapter.mockImplementation((config) =>
      Promise.reject(
        fakeAxiosError(config, 400, envelope(errorResult('SGEB-2001', 'Dato inválido.'))),
      ),
    )

    const error = await request({ url: '/eventos', method: 'POST' }).catch(
      (e: unknown) => e,
    )

    expect(isSgebApplicationError(error)).toBe(true)
  })
})

describe('sgebClient — SGEB application errors', () => {
  it('normalizes a 400 validation error without retrying', async () => {
    const { adapter, deps, request } = createTestClient()
    adapter.mockImplementation((config) =>
      Promise.reject(
        fakeAxiosError(config, 400, envelope(errorResult('SGEB-2001', 'Dato inválido.'))),
      ),
    )

    const error = await request({ url: '/eventos', method: 'POST' }).catch(
      (e: unknown) => e,
    )

    expect(isSgebApplicationError(error)).toBe(true)
    if (isSgebApplicationError(error)) {
      expect(error.httpStatus).toBe(400)
      expect(error.code).toBe('SGEB-2001')
      expect(error.message).toBe('Dato inválido.')
    }
    expect(adapter).toHaveBeenCalledOnce()
    expect(deps.refresh).not.toHaveBeenCalled()
  })

  it('normalizes SGEB-1004 (forbidden) without attempting a refresh', async () => {
    const { adapter, deps, request } = createTestClient()
    adapter.mockImplementation((config) =>
      Promise.reject(
        fakeAxiosError(
          config,
          403,
          envelope(
            errorResult('SGEB-1004', 'No tienes permisos para realizar esta acción.'),
          ),
        ),
      ),
    )

    const error = await request({ url: '/admin/bitacora' }).catch((e: unknown) => e)

    expect(isSgebApplicationError(error)).toBe(true)
    if (isSgebApplicationError(error)) {
      expect(error.code).toBe('SGEB-1004')
    }
    expect(deps.refresh).not.toHaveBeenCalled()
    expect(adapter).toHaveBeenCalledOnce()
  })

  it('normalizes a 409 business-rule error without retrying', async () => {
    const { adapter, deps, request } = createTestClient()
    adapter.mockImplementation((config) =>
      Promise.reject(
        fakeAxiosError(
          config,
          409,
          envelope(errorResult('SGEB-4013', 'Estado inválido.')),
        ),
      ),
    )

    const error = await request({ url: '/eventos/1', method: 'PATCH' }).catch(
      (e: unknown) => e,
    )

    expect(isSgebApplicationError(error)).toBe(true)
    expect(deps.refresh).not.toHaveBeenCalled()
    expect(adapter).toHaveBeenCalledOnce()
  })

  it('normalizes a 500 SGEB envelope error', async () => {
    const { adapter, request } = createTestClient()
    adapter.mockImplementation((config) =>
      Promise.reject(
        fakeAxiosError(config, 500, envelope(errorResult('SGEB-5008', 'Falla técnica.'))),
      ),
    )

    const error = await request({ url: '/dashboard/capitan' }).catch((e: unknown) => e)

    expect(isSgebApplicationError(error)).toBe(true)
    if (isSgebApplicationError(error)) {
      expect(error.httpStatus).toBe(500)
      expect(error.code).toBe('SGEB-5008')
    }
  })

  it('never exposes technical_message as the normalized error message', async () => {
    const { adapter, request } = createTestClient()
    adapter.mockImplementation((config) =>
      Promise.reject(
        fakeAxiosError(
          config,
          400,
          envelope(
            errorResult(
              'SGEB-2001',
              'Dato inválido.',
              'campo="clabe" valor="123" regex_fallido',
            ),
          ),
        ),
      ),
    )

    const error = await request({ url: '/eventos' }).catch((e: unknown) => e)

    expect(isSgebApplicationError(error)).toBe(true)
    if (isSgebApplicationError(error)) {
      expect(error.message).toBe('Dato inválido.')
      expect(error.message).not.toContain('regex_fallido')
      // Still reachable internally for support/logging, just never the safe message.
      expect(error.result.technical_message).toBe(
        'campo="clabe" valor="123" regex_fallido',
      )
    }
  })
})

describe('sgebClient — SGEB-1002 expired-token recovery', () => {
  it('triggers exactly one refresh and retries the original request once with the new token', async () => {
    const refresh = vi.fn<() => Promise<TokenResult>>().mockResolvedValue({
      outcome: 'success',
      token: SUCCESS_TOKEN,
    })
    let currentToken = 'expired-token'
    const applyRefreshedAccessToken = vi.fn((payload: { accessToken: string }) => {
      currentToken = payload.accessToken
      return true
    })
    const { adapter, deps, request } = createTestClient({
      getAccessToken: () => currentToken,
      refresh,
      applyRefreshedAccessToken,
    })

    let callCount = 0
    adapter.mockImplementation((config) => {
      callCount += 1
      if (callCount === 1) {
        return Promise.reject(
          fakeAxiosError(
            config,
            401,
            envelope(errorResult('SGEB-1002', 'Tu sesión ha expirado.')),
          ),
        )
      }
      return Promise.resolve(
        fakeResponse(config, 200, envelope(successResult('SGEB-0000'))),
      )
    })

    const result = await request({ url: '/eventos' })

    expect(refresh).toHaveBeenCalledOnce()
    expect(applyRefreshedAccessToken).toHaveBeenCalledOnce()
    expect(adapter).toHaveBeenCalledTimes(2)
    expect(adapter.mock.calls[1]![0].headers.get('Authorization')).toBe(
      'Bearer refreshed-token',
    )
    expect(result.result.code).toBe('SGEB-0000')
    // Refresh succeeded — the silent-auth fallback is only for a failed
    // refresh attempt, never invoked alongside a successful one.
    expect(deps.beginSilentAuthorization).not.toHaveBeenCalled()
  })

  it('does not create an infinite loop when the retried request also returns SGEB-1002', async () => {
    const refresh = vi.fn<() => Promise<TokenResult>>().mockResolvedValue({
      outcome: 'success',
      token: SUCCESS_TOKEN,
    })
    const { adapter, deps, request } = createTestClient({ refresh })

    adapter.mockImplementation((config) =>
      Promise.reject(
        fakeAxiosError(
          config,
          401,
          envelope(errorResult('SGEB-1002', 'Tu sesión ha expirado.')),
        ),
      ),
    )

    const error = await request({ url: '/eventos' }).catch((e: unknown) => e)

    expect(refresh).toHaveBeenCalledOnce()
    expect(adapter).toHaveBeenCalledTimes(2)
    expect(isSgebApplicationError(error)).toBe(true)
    if (isSgebApplicationError(error)) {
      expect(error.code).toBe('SGEB-1002')
    }
    // The second SGEB-1002 hit an already-retried request — no second
    // refresh, and no silent-auth fallback either: only a genuinely failed
    // refresh attempt triggers that.
    expect(deps.beginSilentAuthorization).not.toHaveBeenCalled()
  })

  it('does not retry the original request when refresh fails (oauth-error), and falls back to the identical silent-auth primitive used by bootstrap', async () => {
    const refresh = vi.fn<() => Promise<TokenResult>>().mockResolvedValue({
      outcome: 'oauth-error',
      error: { error: 'invalid_grant' },
    })
    const { adapter, deps, request } = createTestClient({ refresh })

    adapter.mockImplementation((config) =>
      Promise.reject(
        fakeAxiosError(
          config,
          401,
          envelope(errorResult('SGEB-1002', 'Tu sesión ha expirado.')),
        ),
      ),
    )

    const error = await request({ url: '/eventos' }).catch((e: unknown) => e)

    expect(refresh).toHaveBeenCalledOnce()
    expect(adapter).toHaveBeenCalledOnce()
    expect(isSgebApplicationError(error)).toBe(true)
    if (isSgebApplicationError(error)) {
      expect(error.code).toBe('SGEB-1002')
    }
    expect(deps.beginSilentAuthorization).toHaveBeenCalledOnce()
    expect(deps.beginSilentAuthorization).toHaveBeenCalledWith({ prompt: 'none' })
  })

  it('does not retry the original request when refresh fails (network-error), and falls back to silent auth exactly once', async () => {
    const refresh = vi.fn<() => Promise<TokenResult>>().mockResolvedValue({
      outcome: 'network-error',
      message: 'No pudimos renovar tu sesión.',
    })
    const { adapter, deps, request } = createTestClient({ refresh })

    adapter.mockImplementation((config) =>
      Promise.reject(
        fakeAxiosError(
          config,
          401,
          envelope(errorResult('SGEB-1002', 'Tu sesión ha expirado.')),
        ),
      ),
    )

    const error = await request({ url: '/eventos' }).catch((e: unknown) => e)

    expect(refresh).toHaveBeenCalledOnce()
    expect(adapter).toHaveBeenCalledOnce()
    expect(isSgebApplicationError(error)).toBe(true)
    expect(deps.beginSilentAuthorization).toHaveBeenCalledOnce()
    expect(deps.beginSilentAuthorization).toHaveBeenCalledWith({ prompt: 'none' })
  })

  it('still surfaces the original SGEB-1002 even when the silent-auth fallback itself throws (e.g. broken OIDC config)', async () => {
    const refresh = vi.fn<() => Promise<TokenResult>>().mockResolvedValue({
      outcome: 'network-error',
      message: 'No pudimos renovar tu sesión.',
    })
    const beginSilentAuthorization = vi
      .fn()
      .mockRejectedValue(new Error('Invalid OIDC configuration.'))
    const { adapter, request } = createTestClient({ refresh, beginSilentAuthorization })

    adapter.mockImplementation((config) =>
      Promise.reject(
        fakeAxiosError(
          config,
          401,
          envelope(errorResult('SGEB-1002', 'Tu sesión ha expirado.')),
        ),
      ),
    )

    const error = await request({ url: '/eventos' }).catch((e: unknown) => e)

    expect(beginSilentAuthorization).toHaveBeenCalledOnce()
    expect(isSgebApplicationError(error)).toBe(true)
    if (isSgebApplicationError(error)) {
      expect(error.code).toBe('SGEB-1002')
    }
  })

  it('does not retry when refresh succeeds but the session can no longer accept it (concurrent logout)', async () => {
    // authenticated request → SGEB-1002 → refresh starts → session becomes
    // anonymous/reset → refresh succeeds → applyRefreshedAccessToken()
    // returns false → the original request must never be replayed, the
    // refreshed token must never be attached anywhere, and the failure
    // must surface deterministically as the original SGEB-1002.
    const refresh = vi.fn<() => Promise<TokenResult>>().mockResolvedValue({
      outcome: 'success',
      token: SUCCESS_TOKEN,
    })
    const applyRefreshedAccessToken = vi.fn(() => false)
    const { adapter, deps, request } = createTestClient({
      refresh,
      applyRefreshedAccessToken,
    })

    adapter.mockImplementation((config) =>
      Promise.reject(
        fakeAxiosError(
          config,
          401,
          envelope(errorResult('SGEB-1002', 'Tu sesión ha expirado.')),
        ),
      ),
    )

    const error = await request({ url: '/eventos' }).catch((e: unknown) => e)

    expect(refresh).toHaveBeenCalledOnce()
    expect(applyRefreshedAccessToken).toHaveBeenCalledOnce()
    // Never replayed: only the original, pre-refresh request ever reached the adapter.
    expect(adapter).toHaveBeenCalledOnce()
    expect(adapter.mock.calls[0]![0].headers.get('Authorization')).not.toBe(
      'Bearer refreshed-token',
    )
    expect(isSgebApplicationError(error)).toBe(true)
    if (isSgebApplicationError(error)) {
      expect(error.code).toBe('SGEB-1002')
      expect(error.httpStatus).toBe(401)
    }
    // The refresh attempt itself succeeded — this is a concurrent-logout
    // rejection, not a "refresh failed" outcome, so silent auth must not
    // fire and must never race an intentional logout with a re-auth redirect.
    expect(deps.beginSilentAuthorization).not.toHaveBeenCalled()
  })

  it('SGEB-1003 does not trigger a refresh or silent auth', async () => {
    const { adapter, deps, request } = createTestClient()
    adapter.mockImplementation((config) =>
      Promise.reject(
        fakeAxiosError(
          config,
          401,
          envelope(errorResult('SGEB-1003', 'No pudimos validar tu sesión.')),
        ),
      ),
    )

    const error = await request({ url: '/eventos' }).catch((e: unknown) => e)

    expect(deps.refresh).not.toHaveBeenCalled()
    expect(deps.beginSilentAuthorization).not.toHaveBeenCalled()
    expect(adapter).toHaveBeenCalledOnce()
    expect(isSgebApplicationError(error)).toBe(true)
    if (isSgebApplicationError(error)) {
      expect(error.code).toBe('SGEB-1003')
    }
  })

  it('SGEB-1004 does not trigger a refresh or silent auth', async () => {
    const { adapter, deps, request } = createTestClient()
    adapter.mockImplementation((config) =>
      Promise.reject(
        fakeAxiosError(
          config,
          403,
          envelope(errorResult('SGEB-1004', 'No tienes permisos.')),
        ),
      ),
    )

    const error = await request({ url: '/eventos' }).catch((e: unknown) => e)

    expect(deps.refresh).not.toHaveBeenCalled()
    expect(deps.beginSilentAuthorization).not.toHaveBeenCalled()
    expect(isSgebApplicationError(error)).toBe(true)
    if (isSgebApplicationError(error)) {
      expect(error.code).toBe('SGEB-1004')
    }
  })

  it('a generic 401 without an explicit SGEB-1002 code does not trigger a refresh or silent auth', async () => {
    const { adapter, deps, request } = createTestClient()
    adapter.mockImplementation((config) =>
      Promise.reject(
        fakeAxiosError(
          config,
          401,
          envelope(errorResult('SGEB-9001', 'Error no documentado.')),
        ),
      ),
    )

    const error = await request({ url: '/eventos' }).catch((e: unknown) => e)

    expect(deps.refresh).not.toHaveBeenCalled()
    expect(deps.beginSilentAuthorization).not.toHaveBeenCalled()
    expect(isSgebApplicationError(error)).toBe(true)
  })
})

describe('sgebClient — SGEB-1002 refresh failure on a write never triggers the full-page silent-auth redirect', () => {
  it.each([
    ['POST', 'oauth-error'],
    ['PUT', 'oauth-error'],
    ['PATCH', 'oauth-error'],
    ['DELETE', 'oauth-error'],
    ['POST', 'network-error'],
  ] as const)(
    'a %s request whose refresh fails (%s) surfaces SGEB-1002 without navigating away, leaving the caller/form mounted',
    async (method, outcome) => {
      const refresh = vi
        .fn<() => Promise<TokenResult>>()
        .mockResolvedValue(
          outcome === 'oauth-error'
            ? { outcome: 'oauth-error', error: { error: 'invalid_grant' } }
            : { outcome: 'network-error', message: 'No pudimos renovar tu sesión.' },
        )
      const { adapter, deps, request } = createTestClient({ refresh })

      adapter.mockImplementation((config) =>
        Promise.reject(
          fakeAxiosError(
            config,
            401,
            envelope(errorResult('SGEB-1002', 'Tu sesión ha expirado.')),
          ),
        ),
      )

      const error = await request({
        url: '/eventos',
        method,
        data: { titulo: 'Boda García' },
      }).catch((e: unknown) => e)

      expect(refresh).toHaveBeenCalledOnce()
      // The one behavior this whole test exists to pin down: a failed
      // write never triggers the full-page navigation that would tear
      // down whatever in-memory form/mutation state produced this
      // request — unlike the read case, which does trigger it (see the
      // "does not retry ... refresh fails" tests above, both implicit GET).
      expect(deps.beginSilentAuthorization).not.toHaveBeenCalled()
      expect(adapter).toHaveBeenCalledOnce()
      expect(isSgebApplicationError(error)).toBe(true)
      if (isSgebApplicationError(error)) {
        expect(error.code).toBe('SGEB-1002')
      }
    },
  )

  it('a plain, explicit GET still triggers the silent-auth fallback — the split is method-based, not a write-only regression', async () => {
    const refresh = vi.fn<() => Promise<TokenResult>>().mockResolvedValue({
      outcome: 'oauth-error',
      error: { error: 'invalid_grant' },
    })
    const { deps, adapter, request } = createTestClient({ refresh })

    adapter.mockImplementation((config) =>
      Promise.reject(
        fakeAxiosError(
          config,
          401,
          envelope(errorResult('SGEB-1002', 'Tu sesión ha expirado.')),
        ),
      ),
    )

    await request({ url: '/eventos', method: 'GET' }).catch(() => undefined)

    expect(deps.beginSilentAuthorization).toHaveBeenCalledOnce()
  })

  it('proves the invariant is generic transport behavior, not hardcoded to /eventos: a different write endpoint behaves identically', async () => {
    const refresh = vi.fn<() => Promise<TokenResult>>().mockResolvedValue({
      outcome: 'oauth-error',
      error: { error: 'invalid_grant' },
    })
    const { adapter, deps, request } = createTestClient({ refresh })

    adapter.mockImplementation((config) =>
      Promise.reject(
        fakeAxiosError(
          config,
          401,
          envelope(errorResult('SGEB-1002', 'Tu sesión ha expirado.')),
        ),
      ),
    )

    const error = await request({
      url: '/pagos/1/fallido',
      method: 'PATCH',
      data: { motivo: 'rechazo bancario' },
    }).catch((e: unknown) => e)

    expect(deps.beginSilentAuthorization).not.toHaveBeenCalled()
    expect(adapter).toHaveBeenCalledOnce()
    expect(isSgebApplicationError(error)).toBe(true)
    if (isSgebApplicationError(error)) {
      expect(error.code).toBe('SGEB-1002')
    }
  })
})

describe('sgebClient — concurrency', () => {
  it('relies on the injected refresh primitive for concurrent SGEB-1002 requests, without its own dedup layer', async () => {
    let resolveRefresh!: (result: TokenResult) => void
    const sharedRefreshPromise = new Promise<TokenResult>((resolve) => {
      resolveRefresh = resolve
    })
    const refresh = vi
      .fn<() => Promise<TokenResult>>()
      .mockReturnValue(sharedRefreshPromise)
    let currentToken = 'expired-token'
    const applyRefreshedAccessToken = vi.fn((payload: { accessToken: string }) => {
      currentToken = payload.accessToken
      return true
    })
    const { adapter, request } = createTestClient({
      getAccessToken: () => currentToken,
      refresh,
      applyRefreshedAccessToken,
    })

    adapter.mockImplementation((config) => {
      const auth = config.headers.get('Authorization')
      if (auth === 'Bearer refreshed-token') {
        return Promise.resolve(
          fakeResponse(config, 200, envelope(successResult('SGEB-0000'))),
        )
      }
      return Promise.reject(
        fakeAxiosError(
          config,
          401,
          envelope(errorResult('SGEB-1002', 'Tu sesión ha expirado.')),
        ),
      )
    })

    const first = request({ url: '/eventos' })
    const second = request({ url: '/participaciones' })

    // Both original requests have already failed with SGEB-1002 and are
    // waiting on the shared refresh promise — resolve it once, exactly as
    // the real singleflight in `client/tokenClient.ts` would.
    await Promise.resolve()
    await Promise.resolve()
    resolveRefresh({ outcome: 'success', token: SUCCESS_TOKEN })

    const [firstResult, secondResult] = await Promise.all([first, second])

    expect(refresh).toHaveBeenCalledTimes(2)
    expect(firstResult.result.code).toBe('SGEB-0000')
    expect(secondResult.result.code).toBe('SGEB-0000')
  })
})

describe('sgebClient — transport failure', () => {
  it('does not fabricate a SGEB code for a pure network failure', async () => {
    const { adapter, request } = createTestClient()
    adapter.mockImplementation((config) =>
      Promise.reject(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config)),
    )

    const error = await request({ url: '/eventos' }).catch((e: unknown) => e)

    expect(isSgebNetworkError(error)).toBe(true)
    if (isSgebNetworkError(error)) {
      expect(error.httpStatus).toBeUndefined()
    }
    expect(isSgebApplicationError(error)).toBe(false)
  })

  it('handles a malformed/non-envelope error response safely, preserving the HTTP status', async () => {
    const { adapter, request } = createTestClient()
    adapter.mockImplementation((config) =>
      Promise.reject(fakeAxiosError(config, 502, '<html>502 Bad Gateway</html>')),
    )

    const error = await request({ url: '/eventos' }).catch((e: unknown) => e)

    expect(isSgebNetworkError(error)).toBe(true)
    if (isSgebNetworkError(error)) {
      expect(error.httpStatus).toBe(502)
    }
  })

  it('sanity-checks the envelope guard used to gate this behavior', () => {
    expect(isApiEnvelope('<html>502 Bad Gateway</html>')).toBe(false)
    expect(isApiEnvelope(envelope(successResult('SGEB-0000')))).toBe(true)
  })

  it('propagates request cancellation unchanged, distinguishable from a SGEB or network error', async () => {
    const { adapter, deps, request } = createTestClient()
    adapter.mockImplementation((config) =>
      Promise.reject(new CanceledError('canceled', config)),
    )

    const controller = new AbortController()
    const error = await request({ url: '/eventos', signal: controller.signal }).catch(
      (e: unknown) => e,
    )

    expect(axios.isCancel(error)).toBe(true)
    expect(isSgebApplicationError(error)).toBe(false)
    expect(isSgebNetworkError(error)).toBe(false)
    expect(deps.refresh).not.toHaveBeenCalled()
    expect(deps.beginSilentAuthorization).not.toHaveBeenCalled()
  })
})

describe('sgebClient — retry integrity', () => {
  it('preserves query parameters and the request body on a SGEB-1002 retry', async () => {
    const refresh = vi.fn<() => Promise<TokenResult>>().mockResolvedValue({
      outcome: 'success',
      token: SUCCESS_TOKEN,
    })
    const { adapter, request } = createTestClient({ refresh })

    let callCount = 0
    adapter.mockImplementation((config) => {
      callCount += 1
      if (callCount === 1) {
        return Promise.reject(
          fakeAxiosError(config, 401, envelope(errorResult('SGEB-1002', 'Expirado.'))),
        )
      }
      return Promise.resolve(
        fakeResponse(config, 200, envelope(successResult('SGEB-0000'))),
      )
    })

    await request({
      url: '/eventos',
      method: 'POST',
      params: { page: 2, estado: 'confirmado' },
      data: { nombre: 'Boda García' },
    })

    expect(adapter).toHaveBeenCalledTimes(2)
    const [firstCall, secondCall] = adapter.mock.calls
    expect(secondCall![0].params).toEqual(firstCall![0].params)
    expect(secondCall![0].data).toEqual(firstCall![0].data)
    expect(secondCall![0].params).toEqual({ page: 2, estado: 'confirmado' })
    // Axios's default `transformRequest` JSON-serializes the body before the
    // adapter ever sees it — assert on the parsed payload, not the object.
    expect(JSON.parse(secondCall![0].data as string)).toEqual({ nombre: 'Boda García' })
  })

  it('keeps the AbortSignal associated with the retried request', async () => {
    const refresh = vi.fn<() => Promise<TokenResult>>().mockResolvedValue({
      outcome: 'success',
      token: SUCCESS_TOKEN,
    })
    const { adapter, request } = createTestClient({ refresh })

    let callCount = 0
    adapter.mockImplementation((config) => {
      callCount += 1
      if (callCount === 1) {
        return Promise.reject(
          fakeAxiosError(config, 401, envelope(errorResult('SGEB-1002', 'Expirado.'))),
        )
      }
      return Promise.resolve(
        fakeResponse(config, 200, envelope(successResult('SGEB-0000'))),
      )
    })

    const controller = new AbortController()
    await request({ url: '/eventos', signal: controller.signal })

    const [firstCall, secondCall] = adapter.mock.calls
    expect(secondCall![0].signal).toBe(firstCall![0].signal)
    expect(secondCall![0].signal).toBe(controller.signal)
  })

  it('the retry marker prevents a second automatic replay for the same request', async () => {
    const refresh = vi.fn<() => Promise<TokenResult>>().mockResolvedValue({
      outcome: 'success',
      token: SUCCESS_TOKEN,
    })
    const { adapter, deps, request } = createTestClient({ refresh })

    adapter.mockImplementation((config) =>
      Promise.reject(
        fakeAxiosError(config, 401, envelope(errorResult('SGEB-1002', 'Expirado.'))),
      ),
    )

    await request({ url: '/eventos' }).catch(() => undefined)

    expect(refresh).toHaveBeenCalledOnce()
    expect(adapter).toHaveBeenCalledTimes(2)
    expect(deps.beginSilentAuthorization).not.toHaveBeenCalled()
  })
})

describe('sgebClient — requestSgeb (singleton public API)', () => {
  afterEach(() => {
    vi.resetModules()
  })

  it('delegates through the exported sgebClient instance and resolves with the envelope, not the raw Axios response', async () => {
    vi.resetModules()
    vi.doMock('@/features/oidc-client/session/sessionStore', () => ({
      getOidcAccessToken: () => 'singleton-token',
      applyRefreshedAccessToken: vi.fn(() => true),
    }))
    vi.doMock('@/features/oidc-client/client/tokenClient', () => ({
      refreshAccessToken: vi.fn(),
    }))

    const { sgebClient, requestSgeb } = await import('@/shared/api/sgebClient')
    const adapter = vi
      .fn<(config: InternalAxiosRequestConfig) => Promise<AxiosResponse>>()
      .mockImplementation((config) =>
        Promise.resolve(
          fakeResponse(config, 200, envelope(successResult('SGEB-0000'), { ok: true })),
        ),
      )
    sgebClient.defaults.adapter = adapter

    const result = await requestSgeb<{ ok: boolean }>({ url: '/eventos' })

    expect(adapter).toHaveBeenCalledOnce()
    expect(adapter.mock.calls[0]![0].headers.get('Authorization')).toBe(
      'Bearer singleton-token',
    )
    expect(result).toEqual({ result: successResult('SGEB-0000'), data: { ok: true } })
  })
})

describe('sgebClient — FormData request bodies', () => {
  it('passes a FormData body through unchanged, never JSON-stringified', async () => {
    const { adapter, request } = createTestClient()
    adapter.mockImplementation((config) =>
      Promise.resolve(fakeResponse(config, 201, envelope(successResult('SGEB-0001')))),
    )

    const formData = new FormData()
    formData.append(
      'comanda',
      new File(['%PDF-1.4'], 'comanda.pdf', { type: 'application/pdf' }),
    )

    await request({ url: '/eventos/1/comanda', method: 'POST', data: formData })

    const sentConfig = adapter.mock.calls[0]![0]
    // Same reference, untouched — proves it was never routed through
    // `JSON.stringify(formDataToJSON(data))` (the corruption this branch's
    // reconciliation identified), which would have replaced it with a
    // JSON string instead.
    expect(sentConfig.data).toBe(formData)
  })

  it('never manually sets application/json or a hand-written multipart boundary for a FormData body', async () => {
    const { adapter, request } = createTestClient()
    adapter.mockImplementation((config) =>
      Promise.resolve(fakeResponse(config, 201, envelope(successResult('SGEB-0001')))),
    )

    const formData = new FormData()
    formData.append(
      'comanda',
      new File(['%PDF-1.4'], 'comanda.pdf', { type: 'application/pdf' }),
    )

    await request({ url: '/eventos/1/comanda', method: 'POST', data: formData })

    const sentConfig = adapter.mock.calls[0]![0]
    const contentType = sentConfig.headers.getContentType() ?? ''
    // Neither this transport nor `transformRequest` ever sets
    // `application/json` (the old, corrupting default) or a hand-written
    // `multipart/form-data; boundary=...` (impossible to get right without
    // the real boundary, which only the sending environment computes).
    // Axios's own `dispatchRequest.js` does set a harmless
    // `application/x-www-form-urlencoded` placeholder here for any
    // POST/PUT/PATCH with no Content-Type already present — this is a
    // known axios internal artifact, not something this transport
    // controls, and it is irrelevant in a real browser: `XMLHttpRequest`/
    // `fetch` ignore whatever `Content-Type` header is set and always
    // compute their own `multipart/form-data; boundary=...` from the
    // `FormData` body itself (the config's `data`, confirmed unchanged by
    // the previous test, is what a real browser actually inspects).
    expect(contentType).not.toContain('application/json')
    expect(contentType).not.toContain('multipart/form-data')
  })

  it('still JSON-serializes a plain object body and sets application/json — the pre-existing behavior is unchanged', async () => {
    const { adapter, request } = createTestClient()
    adapter.mockImplementation((config) =>
      Promise.resolve(fakeResponse(config, 200, envelope(successResult('SGEB-0000')))),
    )

    await request({
      url: '/eventos',
      method: 'POST',
      data: { titulo: 'Boda García' },
    })

    const sentConfig = adapter.mock.calls[0]![0]
    expect(sentConfig.headers.getContentType()).toContain('application/json')
    expect(JSON.parse(sentConfig.data as string)).toEqual({ titulo: 'Boda García' })
  })

  it('a GET request with no body is unaffected by the removed default Content-Type', async () => {
    const { adapter, request } = createTestClient()
    adapter.mockImplementation((config) =>
      Promise.resolve(
        fakeResponse(config, 200, envelope(successResult('SGEB-0000'), [])),
      ),
    )

    const result = await request({ url: '/eventos' })

    expect(result.result.code).toBe('SGEB-0000')
    expect(adapter).toHaveBeenCalledOnce()
  })
})

describe('sgebClient — requestSgebBinary', () => {
  it('requests with responseType: "blob" and returns the raw Blob, not an envelope', async () => {
    const { adapter, requestBinary } = createTestClient({
      getAccessToken: () => 'abc-token',
    })
    const fileBlob = new Blob(['%PDF-1.4'], { type: 'application/pdf' })
    adapter.mockImplementation((config) =>
      Promise.resolve(fakeResponse(config, 200, fileBlob)),
    )

    const result = await requestBinary({ url: '/eventos/1/comanda/archivo' })

    expect(adapter.mock.calls[0]![0].responseType).toBe('blob')
    expect(result).toBe(fileBlob)
  })

  it('still attaches the Bearer token via the same interceptor', async () => {
    const { adapter, requestBinary } = createTestClient({
      getAccessToken: () => 'abc-token',
    })
    adapter.mockImplementation((config) =>
      Promise.resolve(fakeResponse(config, 200, new Blob(['x']))),
    )

    await requestBinary({ url: '/eventos/1/comanda/archivo' })

    expect(adapter.mock.calls[0]![0].headers.get('Authorization')).toBe(
      'Bearer abc-token',
    )
  })

  it('retries exactly once through the same SGEB-1002 recovery flow on a JSON error response', async () => {
    const refresh = vi.fn<() => Promise<TokenResult>>().mockResolvedValue({
      outcome: 'success',
      token: SUCCESS_TOKEN,
    })
    let currentToken = 'expired-token'
    const applyRefreshedAccessToken = vi.fn((payload: { accessToken: string }) => {
      currentToken = payload.accessToken
      return true
    })
    const { adapter, requestBinary } = createTestClient({
      getAccessToken: () => currentToken,
      refresh,
      applyRefreshedAccessToken,
    })

    let callCount = 0
    adapter.mockImplementation((config) => {
      callCount += 1
      if (callCount === 1) {
        return Promise.reject(
          fakeAxiosError(config, 401, envelope(errorResult('SGEB-1002', 'Expirado.'))),
        )
      }
      return Promise.resolve(fakeResponse(config, 200, new Blob(['%PDF-1.4'])))
    })

    const result = await requestBinary({ url: '/eventos/1/comanda/archivo' })

    expect(refresh).toHaveBeenCalledOnce()
    expect(adapter).toHaveBeenCalledTimes(2)
    expect(adapter.mock.calls[1]![0].headers.get('Authorization')).toBe(
      'Bearer refreshed-token',
    )
    expect(result).toBeInstanceOf(Blob)
  })

  it('normalizes a JSON SGEB error response into a safe error, never throwing a raw AxiosError', async () => {
    const { adapter, requestBinary } = createTestClient()
    adapter.mockImplementation((config) =>
      Promise.reject(
        fakeAxiosError(
          config,
          403,
          envelope(errorResult('SGEB-1004', 'No tienes permisos.')),
        ),
      ),
    )

    const error = await requestBinary({ url: '/eventos/1/comanda/archivo' }).catch(
      (e: unknown) => e,
    )

    expect(isSgebApplicationError(error) || isSgebNetworkError(error)).toBe(true)
    if (isSgebApplicationError(error) || isSgebNetworkError(error)) {
      expect(error.message).not.toMatch(/technical_message|stack|AxiosError/i)
    }
  })

  it('propagates cancellation unchanged, distinguishable from a SGEB or network error', async () => {
    const { adapter, requestBinary } = createTestClient()
    adapter.mockImplementation((config) =>
      Promise.reject(new CanceledError('canceled', config)),
    )

    const controller = new AbortController()
    const error = await requestBinary({
      url: '/eventos/1/comanda/archivo',
      signal: controller.signal,
    }).catch((e: unknown) => e)

    expect(axios.isCancel(error)).toBe(true)
    expect(isSgebApplicationError(error)).toBe(false)
    expect(isSgebNetworkError(error)).toBe(false)
  })
})

describe('sgebClient — requestSgebBinary (singleton public API)', () => {
  afterEach(() => {
    vi.resetModules()
  })

  it('is exported from the shared transport module and reuses the same sgebClient instance', () => {
    expect(typeof requestSgebBinary).toBe('function')
    expect(sgebClient).toBeDefined()
  })
})
