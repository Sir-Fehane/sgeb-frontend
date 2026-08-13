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
  type SgebAuthDependencies,
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
    ...depsOverrides,
  }

  attachSgebAuthInterceptors(instance, deps)

  const adapter = vi.fn<(config: InternalAxiosRequestConfig) => Promise<AxiosResponse>>()
  instance.defaults.adapter = adapter

  async function request<TData>(config: SgebRequestConfig): Promise<ApiEnvelope<TData>> {
    const response = await instance.request<ApiEnvelope<TData>>(config)
    return response.data
  }

  return { instance, deps, adapter, request }
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
  it.each([
    ['SGEB-0000', { foo: 'bar' }],
    ['SGEB-0001', { id: 1 }],
  ])('preserves a %s success envelope, result and typed data', async (code, data) => {
    const { adapter, request } = createTestClient()
    adapter.mockImplementation((config) =>
      Promise.resolve(fakeResponse(config, 200, envelope(successResult(code), data))),
    )

    const result = await request<typeof data>({ url: '/eventos' })

    expect(result.result.code).toBe(code)
    expect(result.data).toEqual(data)
  })

  it('preserves SGEB-0002 (empty-result success) with null data', async () => {
    const { adapter, request } = createTestClient()
    adapter.mockImplementation((config) =>
      Promise.resolve(
        fakeResponse(config, 200, envelope(successResult('SGEB-0002'), [])),
      ),
    )

    const result = await request({ url: '/eventos' })

    expect(result.result.code).toBe('SGEB-0002')
    expect(result.data).toEqual([])
  })

  it('preserves SGEB-0004 (partial success) as a resolved promise, never a rejection', async () => {
    const { adapter, request } = createTestClient()
    const partialData = { resumen: { total: 5 }, cierre: null }
    adapter.mockImplementation((config) =>
      Promise.resolve(
        fakeResponse(
          config,
          200,
          envelope(successResult('SGEB-0004', 'Éxito parcial.'), partialData),
        ),
      ),
    )

    const result = await request({ url: '/dashboard/capitan' })

    expect(result.result.code).toBe('SGEB-0004')
    expect(result.data).toEqual(partialData)
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
    const { adapter, request } = createTestClient({
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
  })

  it('does not create an infinite loop when the retried request also returns SGEB-1002', async () => {
    const refresh = vi.fn<() => Promise<TokenResult>>().mockResolvedValue({
      outcome: 'success',
      token: SUCCESS_TOKEN,
    })
    const { adapter, request } = createTestClient({ refresh })

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
  })

  it('does not retry the original request when refresh fails (oauth-error)', async () => {
    const refresh = vi.fn<() => Promise<TokenResult>>().mockResolvedValue({
      outcome: 'oauth-error',
      error: { error: 'invalid_grant' },
    })
    const { adapter, request } = createTestClient({ refresh })

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
  })

  it('does not retry the original request when refresh fails (network-error)', async () => {
    const refresh = vi.fn<() => Promise<TokenResult>>().mockResolvedValue({
      outcome: 'network-error',
      message: 'No pudimos renovar tu sesión.',
    })
    const { adapter, request } = createTestClient({ refresh })

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
    const { adapter, request } = createTestClient({ refresh, applyRefreshedAccessToken })

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
  })

  it('SGEB-1003 does not trigger a refresh', async () => {
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
    expect(adapter).toHaveBeenCalledOnce()
    expect(isSgebApplicationError(error)).toBe(true)
    if (isSgebApplicationError(error)) {
      expect(error.code).toBe('SGEB-1003')
    }
  })

  it('a generic 401 without an explicit SGEB-1002 code does not trigger a refresh', async () => {
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
    expect(isSgebApplicationError(error)).toBe(true)
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
    const { adapter, request } = createTestClient({ refresh })

    adapter.mockImplementation((config) =>
      Promise.reject(
        fakeAxiosError(config, 401, envelope(errorResult('SGEB-1002', 'Expirado.'))),
      ),
    )

    await request({ url: '/eventos' }).catch(() => undefined)

    expect(refresh).toHaveBeenCalledOnce()
    expect(adapter).toHaveBeenCalledTimes(2)
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
