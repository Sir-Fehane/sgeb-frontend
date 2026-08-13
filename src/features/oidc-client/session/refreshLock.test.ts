import { describe, expect, it, vi } from 'vitest'

import {
  createWithRefreshLock,
  RefreshLockUnavailableError,
  type LockManagerLike,
} from '@/features/oidc-client/session/refreshLock'

/**
 * Deterministic in-memory stand-in for `navigator.locks` (unavailable in
 * jsdom, and real cross-tab timing cannot be exercised from one test
 * process anyway). Serializes `request()` calls exactly like a single
 * exclusive Web Lock: the second caller's `callback` does not start until
 * the first's promise has settled — and, matching the real API, always
 * releases (even after the callback throws) so the next caller is never
 * permanently blocked.
 */
function createFakeLockManager(): LockManagerLike {
  let queue: Promise<void> = Promise.resolve()
  return {
    request: async (_name, _options, callback) => {
      const previous = queue
      let release!: () => void
      queue = new Promise<void>((resolve) => {
        release = resolve
      })
      await previous.catch(() => undefined)
      try {
        return await callback()
      } finally {
        release()
      }
    },
  }
}

describe('createWithRefreshLock — unsupported Web Locks API', () => {
  it('rejects with RefreshLockUnavailableError and never runs the callback', async () => {
    const withLock = createWithRefreshLock(undefined)
    const run = vi.fn().mockResolvedValue('result')

    await expect(withLock(run)).rejects.toThrow(RefreshLockUnavailableError)
    expect(run).not.toHaveBeenCalled()
  })

  it("reports the reason as 'unsupported'", async () => {
    const withLock = createWithRefreshLock(undefined)

    await expect(withLock(() => Promise.resolve('x'))).rejects.toMatchObject({
      reason: 'unsupported',
    })
  })
})

describe('createWithRefreshLock — with a lock manager', () => {
  it('only one holder runs at a time; a second caller waits for the first to release', async () => {
    const locks = createFakeLockManager()
    const withLock = createWithRefreshLock(locks)
    const order: string[] = []

    let resolveFirst!: () => void
    const first = withLock(async () => {
      order.push('first-start')
      await new Promise<void>((resolve) => {
        resolveFirst = resolve
      })
      order.push('first-end')
      return 'first'
    })

    const second = withLock(() => {
      order.push('second-start')
      return Promise.resolve('second')
    })

    // The second caller must not have started yet — it's queued behind the
    // still-in-flight first holder.
    await Promise.resolve()
    await Promise.resolve()
    expect(order).toEqual(['first-start'])

    resolveFirst()
    const [firstResult, secondResult] = await Promise.all([first, second])

    expect(firstResult).toBe('first')
    expect(secondResult).toBe('second')
    expect(order).toEqual(['first-start', 'first-end', 'second-start'])
  })

  it('a failed holder still releases the lock for the next caller (no permanent stale lock)', async () => {
    const locks = createFakeLockManager()
    const withLock = createWithRefreshLock(locks)

    await expect(
      withLock(() => Promise.reject(new Error('refresh failed'))),
    ).rejects.toThrow('refresh failed')

    const result = await withLock(() => Promise.resolve('after-failure'))
    expect(result).toBe('after-failure')
  })

  it('propagates a genuine failure from the callback as-is, not as a coordination failure', async () => {
    const locks = createFakeLockManager()
    const withLock = createWithRefreshLock(locks)
    const run = vi.fn().mockRejectedValue(new Error('network down'))

    const rejection = await withLock(run).catch((error: unknown) => error)

    expect(rejection).not.toBeInstanceOf(RefreshLockUnavailableError)
    expect(rejection).toBeInstanceOf(Error)
    expect((rejection as Error).message).toBe('network down')
    expect(run).toHaveBeenCalledOnce()
  })
})

describe('createWithRefreshLock — bounded wait, fail-safe (never runs unlocked)', () => {
  it('on timeout, rejects with RefreshLockUnavailableError and never calls the transport unlocked', async () => {
    const timeoutLocks: LockManagerLike = {
      request: () => {
        const error = new DOMException('The operation timed out.', 'TimeoutError')
        return Promise.reject(error)
      },
    }
    const withLock = createWithRefreshLock(timeoutLocks)
    const run = vi.fn().mockResolvedValue('should never run')

    await expect(withLock(run)).rejects.toThrow(RefreshLockUnavailableError)
    await expect(withLock(run)).rejects.toMatchObject({ reason: 'timeout' })
    expect(run).not.toHaveBeenCalled()
  })

  it('on an aborted lock request, rejects with RefreshLockUnavailableError and never calls the transport unlocked', async () => {
    const abortLocks: LockManagerLike = {
      request: () => {
        const error = new DOMException('The request was aborted.', 'AbortError')
        return Promise.reject(error)
      },
    }
    const withLock = createWithRefreshLock(abortLocks)
    const run = vi.fn().mockResolvedValue('should never run')

    await expect(withLock(run)).rejects.toThrow(RefreshLockUnavailableError)
    expect(run).not.toHaveBeenCalled()
  })

  it('on any other lock-acquisition failure, rejects with RefreshLockUnavailableError and never calls the transport unlocked', async () => {
    const brokenLocks: LockManagerLike = {
      request: () => Promise.reject(new Error('lock manager internal error')),
    }
    const withLock = createWithRefreshLock(brokenLocks)
    const run = vi.fn().mockResolvedValue('should never run')

    await expect(withLock(run)).rejects.toThrow(RefreshLockUnavailableError)
    await expect(withLock(run)).rejects.toMatchObject({ reason: 'lock-error' })
    expect(run).not.toHaveBeenCalled()
  })

  it('a manager that fails to grant the lock at all does not deadlock the next caller — and never ran the callback for the failed attempt', async () => {
    let callCount = 0
    let calledBack = false
    const flakyThenRecoveringLocks: LockManagerLike = {
      request: async (_name, _options, callback) => {
        callCount += 1
        if (callCount === 1) {
          // Simulate the lock manager itself failing before ever granting
          // the lock (e.g. representing a torn-down holder from the
          // manager's perspective) — `callback` is deliberately never
          // invoked here, mirroring what the real Web Locks API does when
          // a tab holding the lock is destroyed: the next requester is
          // still granted the lock normally.
          throw new Error('lock manager could not grant the lock')
        }
        return callback()
      },
    }
    const withLock = createWithRefreshLock(flakyThenRecoveringLocks)

    await expect(withLock(() => Promise.resolve('never reached'))).rejects.toThrow(
      RefreshLockUnavailableError,
    )
    expect(calledBack).toBe(false)

    const result = await withLock(() => {
      calledBack = true
      return Promise.resolve('second caller proceeds')
    })
    expect(result).toBe('second caller proceeds')
    expect(calledBack).toBe(true)
  })
})

describe('RefreshLockUnavailableError — no token material', () => {
  it('never carries token-like content in its message', () => {
    for (const reason of ['unsupported', 'timeout', 'lock-error'] as const) {
      const error = new RefreshLockUnavailableError(reason)
      expect(error.message.toLowerCase()).not.toMatch(/token|refresh_token|cookie/)
    }
  })
})
