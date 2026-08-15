import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest'

import {
  COMANDA_OBJECT_URL_REVOKE_DELAY_MS,
  useOpenComandaMutation,
} from '@/features/events/queries/useOpenComandaMutation'
import {
  fetchComandaAccess,
  fetchComandaFile,
} from '@/features/events/services/comandaApi'
import { SgebApplicationError } from '@/shared/api/sgebApiError'

vi.mock('@/features/events/services/comandaApi', () => ({
  fetchComandaAccess: vi.fn(),
  fetchComandaFile: vi.fn(),
}))

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

/**
 * A minimal fake of the `Window` returned by `window.open` — only the
 * three members `openComanda` actually touches (`closed`, `location.href`,
 * `close()`). This file tests OUR navigation orchestration given an
 * already-open tab; it makes no claim about, and never needs to simulate,
 * real browser popup-blocking policy — that's `EventDetailComandaSection`'s
 * concern (opening the tab synchronously, before any `await`), covered by
 * `EventDetailComandaSection.test.tsx`.
 */
function fakeTab() {
  return {
    closed: false,
    location: { href: '' },
    close: vi.fn(function (this: { closed: boolean }) {
      this.closed = true
    }),
  }
}

let createObjectUrlSpy: MockInstance<typeof URL.createObjectURL>
let revokeObjectUrlSpy: MockInstance<typeof URL.revokeObjectURL>

beforeEach(() => {
  vi.mocked(fetchComandaAccess).mockReset()
  vi.mocked(fetchComandaFile).mockReset()
  createObjectUrlSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
  revokeObjectUrlSpy = vi
    .spyOn(URL, 'revokeObjectURL')
    .mockImplementation(() => undefined)
})

afterEach(() => {
  createObjectUrlSpy.mockRestore()
  revokeObjectUrlSpy.mockRestore()
  vi.useRealTimers()
})

describe('useOpenComandaMutation', () => {
  it('navigates the ALREADY-OPEN tab to a real https signed URL, never calling window.open itself', async () => {
    vi.mocked(fetchComandaAccess).mockResolvedValue({
      url: 'https://storage.sgeb.mx/comandas/1001/3f2a9c14.pdf',
      expiraEn: '2026-09-01T10:15:00Z',
    })
    const queryClient = new QueryClient()
    const tab = fakeTab()

    const { result } = renderHook(() => useOpenComandaMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    const controller = new AbortController()
    result.current.mutate({ signal: controller.signal, tab: tab as unknown as Window })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchComandaAccess).toHaveBeenCalledWith(1001, controller.signal)
    expect(tab.location.href).toBe('https://storage.sgeb.mx/comandas/1001/3f2a9c14.pdf')
    expect(fetchComandaFile).not.toHaveBeenCalled()
    expect(tab.close).not.toHaveBeenCalled()
  })

  it('falls back to the authenticated binary proxy and navigates the SAME tab (no second tab) when the fresh url is the local:// placeholder', async () => {
    vi.useFakeTimers()
    vi.mocked(fetchComandaAccess).mockResolvedValue({
      url: 'local://comandas/1001/3f2a9c14.pdf',
      expiraEn: null,
    })
    const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' })
    vi.mocked(fetchComandaFile).mockResolvedValue(blob)
    const queryClient = new QueryClient()
    const tab = fakeTab()

    const { result } = renderHook(() => useOpenComandaMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    const controller = new AbortController()
    result.current.mutate({ signal: controller.signal, tab: tab as unknown as Window })

    await vi.waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetchComandaFile).toHaveBeenCalledWith(1001, controller.signal)
    expect(createObjectUrlSpy).toHaveBeenCalledWith(blob)
    expect(tab.location.href).toBe('blob:mock-url')
    expect(revokeObjectUrlSpy).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(COMANDA_OBJECT_URL_REVOKE_DELAY_MS)
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:mock-url')
  })

  it('does not navigate a tab the user already closed, and does not throw', async () => {
    vi.mocked(fetchComandaAccess).mockResolvedValue({
      url: 'https://storage.sgeb.mx/comandas/1001/3f2a9c14.pdf',
      expiraEn: '2026-09-01T10:15:00Z',
    })
    const queryClient = new QueryClient()
    const tab = fakeTab()
    tab.closed = true

    const { result } = renderHook(() => useOpenComandaMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate({
      signal: new AbortController().signal,
      tab: tab as unknown as Window,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(tab.location.href).toBe('')
  })

  it('never stores the signed URL or Blob in the query cache — the mutation resolves void', async () => {
    vi.mocked(fetchComandaAccess).mockResolvedValue({
      url: 'https://storage.sgeb.mx/comandas/1001/3f2a9c14.pdf',
      expiraEn: '2026-09-01T10:15:00Z',
    })
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useOpenComandaMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate({
      signal: new AbortController().signal,
      tab: fakeTab() as unknown as Window,
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeUndefined()
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
  })

  it('closes the tab and surfaces the error when the fresh GET fails', async () => {
    vi.mocked(fetchComandaAccess).mockRejectedValue(
      new SgebApplicationError(403, {
        code: 'SGEB-1004',
        message: 'No tienes permisos.',
      }),
    )
    const queryClient = new QueryClient()
    const tab = fakeTab()

    const { result } = renderHook(() => useOpenComandaMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate({
      signal: new AbortController().signal,
      tab: tab as unknown as Window,
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(tab.close).toHaveBeenCalledOnce()
  })

  it('closes the tab when the binary fallback fails', async () => {
    vi.mocked(fetchComandaAccess).mockResolvedValue({
      url: 'local://comandas/1001/3f2a9c14.pdf',
      expiraEn: null,
    })
    vi.mocked(fetchComandaFile).mockRejectedValue(new Error('network down'))
    const queryClient = new QueryClient()
    const tab = fakeTab()

    const { result } = renderHook(() => useOpenComandaMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate({
      signal: new AbortController().signal,
      tab: tab as unknown as Window,
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(tab.close).toHaveBeenCalledOnce()
  })

  it('throws a safe error and never fetches when no tab was provided (browser refused even the synchronous open)', async () => {
    const queryClient = new QueryClient()

    const { result } = renderHook(() => useOpenComandaMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate({ signal: new AbortController().signal, tab: null })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(fetchComandaAccess).not.toHaveBeenCalled()
    expect(result.current.error?.message).toMatch(/pestaña nueva/)
  })

  it('closes the tab and does not navigate when the caller aborts before the fetch resolves', async () => {
    const controller = new AbortController()
    // Mirrors how a real cancelled axios request behaves: reject
    // immediately if the signal is already aborted by the time the call
    // is made, and also reject if it aborts while still in flight —
    // `mutate()` dispatches to `mutationFn` asynchronously, so the
    // synchronous `controller.abort()` below runs before this mock is
    // ever invoked.
    vi.mocked(fetchComandaAccess).mockImplementation(
      (_idEvento, signal) =>
        new Promise((_resolve, reject) => {
          if (signal?.aborted) {
            reject(new DOMException('canceled', 'AbortError'))
            return
          }
          signal?.addEventListener('abort', () => {
            reject(new DOMException('canceled', 'AbortError'))
          })
        }),
    )
    const queryClient = new QueryClient()
    const tab = fakeTab()

    const { result } = renderHook(() => useOpenComandaMutation(1001), {
      wrapper: createWrapper(queryClient),
    })
    result.current.mutate({ signal: controller.signal, tab: tab as unknown as Window })
    controller.abort()

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(tab.location.href).toBe('')
    expect(tab.close).toHaveBeenCalledOnce()
    expect(fetchComandaFile).not.toHaveBeenCalled()
  })
})
