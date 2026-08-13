/**
 * Cross-tab serialization for `POST /token` (`grant_type=refresh_token`)
 * calls. Required because the provider rotates the refresh token on every
 * use (`docs/api/RESPUESTAS-frontend-FINAL.md` §1): if two tabs each
 * present the same still-valid cookie value at once, the server sees the
 * second request as reuse of an already-rotated token and revokes the
 * whole chain (`SSO-1007`). The existing same-tab singleflight in
 * `client/tokenClient.ts` only dedupes concurrent callers *within* one
 * tab — it cannot see other tabs at all.
 *
 * Built on the native Web Locks API (`navigator.locks`) rather than
 * `BroadcastChannel`/`localStorage`: a named lock carries no payload, so
 * there is no channel to accidentally leak a token through, and the
 * browser's own lock manager releases a lock automatically when the
 * holding tab/document is torn down — "stale locks must recover" and "a
 * tab crash must not permanently deadlock" both fall out of the platform
 * guarantee for free, with no bespoke heartbeat/staleness logic to get
 * wrong.
 *
 * **Fail-safe, not fail-open.** The one invariant this module exists to
 * uphold is "at most one tab may actively perform a refresh-token
 * exchange at a time." A bounded wait exists so a stuck acquisition can
 * never hang the caller forever, but when that bound is hit — or the
 * Web Locks API is unavailable at all — the correct response is to
 * refuse to run the refresh unlocked, never to quietly proceed without
 * coordination. `run` (the actual `/token` network call) is therefore
 * called from exactly one place in this module: inside
 * `locks.request(...)`. There is no fallback branch that invokes it any
 * other way.
 *
 * No `localStorage`-based fallback for browsers without the Web Locks
 * API is implemented. A hand-rolled cross-tab mutex built on
 * `read → compare → write` is not actually atomic across tabs without a
 * careful two-phase ownership protocol (documented but easy to get
 * subtly wrong), and this project targets current evergreen browsers
 * (no documented requirement to support anything older — there is no
 * browserslist config or stated legacy-browser target anywhere in this
 * repo) for an internal captain/admin console, not a mass-market public
 * surface. Getting a bespoke mutex quietly wrong would silently
 * reintroduce the exact race this module exists to close — a worse
 * outcome than a typed, visible "coordination unavailable" result that
 * the caller already knows how to recover from (see
 * `protocol/bootstrap.ts`: any non-`success` refresh outcome degrades
 * toward `prompt=none`, which needs no local cross-tab coordination at
 * all since it always goes through a full page navigation).
 */

const REFRESH_LOCK_NAME = 'sgeb-oidc-refresh'

/**
 * How long a caller waits for another tab's in-flight refresh before
 * giving up on the lock. Bounded deliberately so a stuck acquisition
 * cannot hang the caller forever — but see the module doc comment: the
 * bound expiring means "refuse to refresh unlocked right now," never
 * "proceed without the lock."
 */
const REFRESH_LOCK_WAIT_MS = 10_000

export type RefreshLockUnavailableReason = 'unsupported' | 'timeout' | 'lock-error'

/**
 * Thrown by `withRefreshLock` whenever cross-tab coordination itself
 * could not be established — the Web Locks API is unavailable, the
 * bounded wait elapsed, or the lock manager failed for some other
 * reason before ever granting the lock. Distinguishable from a failure
 * of the locked operation itself (e.g. the `/token` transport
 * rejecting), which propagates as whatever error `run` produced,
 * unwrapped — callers must not confuse "we never got to try" with "we
 * tried and it failed."
 */
export class RefreshLockUnavailableError extends Error {
  readonly reason: RefreshLockUnavailableReason

  constructor(reason: RefreshLockUnavailableReason) {
    super(`Cross-tab refresh coordination unavailable (${reason}).`)
    this.name = 'RefreshLockUnavailableError'
    this.reason = reason
  }
}

export type WithRefreshLock = <T>(run: () => Promise<T>) => Promise<T>

/** The one method this module actually uses from `LockManager` — kept narrow so tests can supply a minimal fake instead of a full Web Locks polyfill. */
export interface LockManagerLike {
  request: <T>(
    name: string,
    options: { signal: AbortSignal },
    callback: () => Promise<T>,
  ) => Promise<T>
}

function getWebLocksApi(): LockManagerLike | undefined {
  if (typeof navigator === 'undefined') {
    return undefined
  }
  return (navigator as Navigator & { locks?: LockManagerLike }).locks
}

/**
 * `true` only for the specific case worth a distinct reason label
 * (the bounded wait actually elapsing). Duck-typed rather than
 * `instanceof DOMException`: the jsdom test environment's `DOMException`
 * does not inherit from its `Error`, even though both Node and every
 * real browser implement it that way.
 */
function isTimeoutError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'TimeoutError'
  )
}

/**
 * Builds a `WithRefreshLock` bound to a specific lock manager (or none).
 * Exported (rather than only the bound `withRefreshLock` below) so tests
 * can inject a deterministic fake — jsdom does not implement the Web
 * Locks API, and real cross-tab timing cannot be exercised from a single
 * test process anyway.
 *
 * Never calls `run` outside of `locks.request(...)`. When `locks` is
 * absent, or acquiring it fails or times out, this rejects with
 * `RefreshLockUnavailableError` and `run` is never invoked at all.
 *
 * Whether `run` was actually reached is tracked explicitly (`ranUnderLock`)
 * rather than inferred from the shape of a caught error — a lock manager
 * can fail to grant the lock for reasons other than `AbortError`/
 * `TimeoutError` (a generic internal failure, say), and that must still
 * be reported as a coordination failure, never mistaken for `run` itself
 * having thrown.
 */
export function createWithRefreshLock(
  locks: LockManagerLike | undefined = getWebLocksApi(),
): WithRefreshLock {
  return async function withRefreshLock<T>(run: () => Promise<T>): Promise<T> {
    if (!locks) {
      throw new RefreshLockUnavailableError('unsupported')
    }

    let ranUnderLock = false
    const trackedRun = () => {
      ranUnderLock = true
      return run()
    }

    try {
      return await locks.request(
        REFRESH_LOCK_NAME,
        { signal: AbortSignal.timeout(REFRESH_LOCK_WAIT_MS) },
        trackedRun,
      )
    } catch (error) {
      if (ranUnderLock) {
        // The lock WAS granted and `run` genuinely started — this is a
        // failure of `run` itself (e.g. the refresh transport rejecting),
        // not a coordination failure. Propagate it as-is.
        throw error
      }
      // The lock was never granted at all — `run` never started, so this
      // is by definition a coordination failure, regardless of what shape
      // the underlying error took.
      throw new RefreshLockUnavailableError(
        isTimeoutError(error) ? 'timeout' : 'lock-error',
      )
    }
  }
}

/** The real, browser-bound lock — what `client/tokenClient.ts` uses by default. */
export const withRefreshLock: WithRefreshLock = createWithRefreshLock()
