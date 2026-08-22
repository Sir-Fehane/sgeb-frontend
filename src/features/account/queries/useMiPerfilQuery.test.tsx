import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useMiPerfilQuery } from '@/features/account/queries/useMiPerfilQuery'
import type { UsuarioApiRecord } from '@/features/account/services/usuariosApi'
import { SgebApplicationError, SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

const RECORD: UsuarioApiRecord = {
  uuid_usuario: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  nombre: 'Ana',
  apellido_paterno: 'Torres',
  apellido_materno: null,
  correo: 'ana.torres@example.com',
  telefono: null,
  activo: true,
}

describe('useMiPerfilQuery', () => {
  it('requests GET /usuarios/me and resolves the mapped profile', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: RECORD,
    })
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useMiPerfilQuery(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requestSgeb).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/usuarios/me' }),
    )
    expect(result.current.data).toEqual({
      uuidUsuario: RECORD.uuid_usuario,
      nombre: 'Ana',
      apellidoPaterno: 'Torres',
      apellidoMaterno: null,
      correo: 'ana.torres@example.com',
      telefono: null,
      activo: true,
    })
  })

  it('retries a SgebNetworkError up to the bounded limit', async () => {
    vi.mocked(requestSgeb).mockRejectedValue(new SgebNetworkError('sin conexión'))
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retryDelay: 0 } },
    })

    const { result } = renderHook(() => useMiPerfilQuery(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 })
    expect(requestSgeb).toHaveBeenCalledTimes(3)
  })

  it('never retries a SgebApplicationError', async () => {
    vi.mocked(requestSgeb).mockRejectedValue(
      new SgebApplicationError(500, {
        code: 'SGEB-5000',
        message: 'Error inesperado.',
      }),
    )
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useMiPerfilQuery(), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(requestSgeb).toHaveBeenCalledTimes(1)
  })
})
