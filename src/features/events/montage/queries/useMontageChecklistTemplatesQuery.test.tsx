import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useMontageChecklistTemplatesQuery } from '@/features/events/montage/queries/useMontageChecklistTemplatesQuery'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useMontageChecklistTemplatesQuery', () => {
  it('requests GET /checklists?tipo=montaje', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: [],
    })

    const { result } = renderHook(() => useMontageChecklistTemplatesQuery(1001), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(requestSgeb).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/checklists', params: { tipo: 'montaje' } }),
    )
  })

  it('never calls the transport when idEvento is null (skipped query)', () => {
    const { result } = renderHook(() => useMontageChecklistTemplatesQuery(null), {
      wrapper: createWrapper(),
    })

    expect(requestSgeb).not.toHaveBeenCalled()
    expect(result.current.fetchStatus).toBe('idle')
  })
})
