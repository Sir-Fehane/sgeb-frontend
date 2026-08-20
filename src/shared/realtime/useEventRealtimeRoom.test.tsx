import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SocketProvider } from '@/shared/realtime/SocketProvider'
import { socket } from '@/shared/realtime/socketClient'
import type { FakeSocket } from '@/shared/realtime/socketClientTestUtils'
import { useEventRealtimeRoom } from '@/shared/realtime/useEventRealtimeRoom'

vi.mock('@/shared/realtime/socketClient', async () => {
  const { createFakeSocket } = await import('@/shared/realtime/socketClientTestUtils')
  return { socket: createFakeSocket() }
})

const fakeSocket = socket as unknown as FakeSocket

function Wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      <SocketProvider>{children}</SocketProvider>
    </QueryClientProvider>
  )
}

function RoomJoiner({ idEvento }: { idEvento: number | null }) {
  useEventRealtimeRoom(idEvento)
  return null
}

beforeEach(() => {
  fakeSocket.emit.mockClear()
})

describe('useEventRealtimeRoom', () => {
  it('joins the room on mount and leaves it on unmount', () => {
    const { unmount } = render(<RoomJoiner idEvento={1001} />, { wrapper: Wrapper })

    expect(fakeSocket.emit).toHaveBeenCalledWith(
      'unirse:evento',
      1001,
      expect.any(Function),
    )

    fakeSocket.emit.mockClear()
    unmount()

    expect(fakeSocket.emit).toHaveBeenCalledWith('salir:evento', 1001)
  })

  it('does nothing when idEvento is null (malformed/unparsed route id)', () => {
    render(<RoomJoiner idEvento={null} />, { wrapper: Wrapper })

    expect(fakeSocket.emit).not.toHaveBeenCalled()
  })

  it('leaves the old room and joins the new one when idEvento changes', () => {
    const { rerender } = render(
      <QueryClientProvider client={new QueryClient()}>
        <SocketProvider>
          <RoomJoiner idEvento={1001} />
        </SocketProvider>
      </QueryClientProvider>,
    )
    fakeSocket.emit.mockClear()

    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <SocketProvider>
          <RoomJoiner idEvento={2002} />
        </SocketProvider>
      </QueryClientProvider>,
    )

    expect(fakeSocket.emit).toHaveBeenCalledWith('salir:evento', 1001)
    expect(fakeSocket.emit).toHaveBeenCalledWith(
      'unirse:evento',
      2002,
      expect.any(Function),
    )
  })

  it('ref-counts two simultaneous joiners of the same event — only leaves the room once the last one unmounts', () => {
    function TwoJoiners({ showSecond }: { showSecond: boolean }) {
      return (
        <>
          <RoomJoiner idEvento={1001} />
          {showSecond ? <RoomJoiner idEvento={1001} /> : null}
        </>
      )
    }
    const { rerender } = render(<TwoJoiners showSecond />, { wrapper: Wrapper })
    fakeSocket.emit.mockClear()

    // Unmounts only the second joiner — the first stays mounted at the same
    // tree position, so its own room membership must not be torn down too.
    rerender(<TwoJoiners showSecond={false} />)
    expect(fakeSocket.emit).not.toHaveBeenCalledWith('salir:evento', 1001)
  })
})
