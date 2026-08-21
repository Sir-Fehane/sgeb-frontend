import axios, {
  AxiosError,
  CanceledError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { describe, expect, it, vi } from 'vitest'

import {
  attachPublicClientInterceptors,
  type PublicRequestConfig,
} from '@/shared/api/publicClient'
import { isSgebApplicationError, isSgebNetworkError } from '@/shared/api/sgebApiError'
import type { ApiEnvelope, ApiResult } from '@/shared/types/api'

function envelope(result: ApiResult, data: unknown = null): ApiEnvelope {
  return { result, data }
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
  return new AxiosError('Request failed', String(status), config, undefined, {
    ...fakeResponse(config, status, data),
  })
}

/** Mirrors `sgebClient.test.ts`'s `createTestClient`: a throwaway instance with a scripted adapter, no real network. */
function createTestClient() {
  const instance = axios.create({ baseURL: 'http://sgeb.test/v1' })
  attachPublicClientInterceptors(instance)

  const adapter = vi.fn<(config: InternalAxiosRequestConfig) => Promise<AxiosResponse>>()
  instance.defaults.adapter = adapter

  async function request<TData>(
    config: PublicRequestConfig,
  ): Promise<ApiEnvelope<TData>> {
    const response = await instance.request<ApiEnvelope<TData>>(config)
    return response.data
  }

  return { instance, adapter, request }
}

describe('publicClient', () => {
  it('never attaches an Authorization header', async () => {
    const { adapter, request } = createTestClient()
    adapter.mockImplementation((config) =>
      Promise.resolve(
        fakeResponse(config, 200, envelope({ code: 'SGEB-0000', message: 'ok' })),
      ),
    )

    await request({ url: '/publico/mesas/qr-1', method: 'GET' })

    const sentConfig = adapter.mock.calls[0]?.[0]
    expect(sentConfig?.headers.get('Authorization')).toBeUndefined()
  })

  it('resolves with the full envelope on success', async () => {
    const { adapter, request } = createTestClient()
    adapter.mockImplementation((config) =>
      Promise.resolve(
        fakeResponse(
          config,
          200,
          envelope({ code: 'SGEB-0000', message: 'ok' }, { etiqueta: 'Mesa 12' }),
        ),
      ),
    )

    const result = await request<{ etiqueta: string }>({
      url: '/publico/mesas/qr-1',
      method: 'GET',
    })

    expect(result.data).toEqual({ etiqueta: 'Mesa 12' })
  })

  it('normalizes a SGEB error envelope into SgebApplicationError, never a raw AxiosError', async () => {
    const { adapter, request } = createTestClient()
    adapter.mockImplementation((config) =>
      Promise.reject(
        fakeAxiosError(
          config,
          404,
          envelope({
            code: 'SGEB-3003',
            message: 'El código QR escaneado no corresponde a ninguna mesa activa.',
          }),
        ),
      ),
    )

    const error = await request({ url: '/publico/mesas/unknown', method: 'GET' }).catch(
      (e: unknown) => e,
    )

    expect(isSgebApplicationError(error)).toBe(true)
    if (isSgebApplicationError(error)) {
      expect(error.code).toBe('SGEB-3003')
      expect(error.httpStatus).toBe(404)
      expect(error.message).toBe(
        'El código QR escaneado no corresponde a ninguna mesa activa.',
      )
    }
  })

  it('normalizes a transport-level failure (no response) into SgebNetworkError', async () => {
    const { adapter, request } = createTestClient()
    adapter.mockImplementation(() => Promise.reject(new Error('network down')))

    const error = await request({ url: '/publico/mesas/qr-1', method: 'GET' }).catch(
      (e: unknown) => e,
    )

    expect(isSgebNetworkError(error)).toBe(true)
  })

  it('propagates cancellation unchanged', async () => {
    const { adapter, request } = createTestClient()
    const cancelError = new CanceledError('canceled')
    adapter.mockImplementation(() => Promise.reject(cancelError))

    await expect(request({ url: '/publico/mesas/qr-1', method: 'GET' })).rejects.toBe(
      cancelError,
    )
  })

  it('never retries or attempts a token refresh — there is no auth session to refresh', async () => {
    const { adapter, request } = createTestClient()
    adapter.mockImplementation((config) =>
      Promise.reject(
        fakeAxiosError(
          config,
          429,
          envelope({ code: 'SGEB-4014', message: 'throttled' }),
        ),
      ),
    )

    await request({ url: '/publico/mesas/qr-1/solicitudes', method: 'POST' }).catch(
      () => null,
    )

    expect(adapter).toHaveBeenCalledOnce()
  })
})
