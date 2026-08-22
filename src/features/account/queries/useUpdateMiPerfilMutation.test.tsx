import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { accountQueryKeys } from '@/features/account/queries/accountQueryKeys'
import { useUpdateMiPerfilMutation } from '@/features/account/queries/useUpdateMiPerfilMutation'
import type { UsuarioApiRecord } from '@/features/account/services/usuariosApi'
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
  nombre: 'Ana María',
  apellido_paterno: 'Torres',
  apellido_materno: null,
  correo: 'ana.torres@example.com',
  telefono: null,
  activo: true,
}

describe('useUpdateMiPerfilMutation', () => {
  it('PUTs /usuarios/me with exactly the given request', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: RECORD,
    })
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useUpdateMiPerfilMutation(), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate({ nombre: 'Ana María' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/usuarios/me',
      method: 'PUT',
      data: { nombre: 'Ana María' },
    })
  })

  it('invalidates the mi-perfil query on success', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: RECORD,
    })
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useUpdateMiPerfilMutation(), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate({ nombre: 'Ana María' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: accountQueryKeys.miPerfil(),
    })
  })

  it('is never retried, regardless of outcome', async () => {
    vi.mocked(requestSgeb).mockRejectedValue(new Error('network down'))
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useUpdateMiPerfilMutation(), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate({ nombre: 'Ana María' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(requestSgeb).toHaveBeenCalledTimes(1)
  })
})
