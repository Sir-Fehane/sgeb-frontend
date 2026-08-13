import type { OidcAuthorizationTransaction } from '@/features/oidc-client/types/transaction'

/** One well-namespaced sessionStorage key — never localStorage (see ADR-002). */
const STORAGE_KEY = 'sgeb.oidc.authorization-transaction'

export const OIDC_DEFAULT_RETURN_TO = '/panel'

/**
 * Synthetic base used only to resolve `returnTo` through the `URL`
 * constructor — never a real origin. Comparing the resolved origin against
 * this fixed value is what rejects anything that specifies its own
 * scheme/host (`https://evil.com`, `//evil.com`), without depending on
 * `window.location`, which this module doesn't otherwise need.
 */
const SYNTHETIC_BASE_ORIGIN = 'http://sgeb-oidc-client.internal'

/**
 * A safe `returnTo` is a same-origin, app-relative path: starts with
 * exactly one `/`, never `//` (protocol-relative), and never resolves to a
 * different origin. Rejects absolute external URLs outright.
 */
export function isSafeReturnTo(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) {
    return false
  }
  if (!value.startsWith('/') || value.startsWith('//')) {
    return false
  }
  try {
    return new URL(value, SYNTHETIC_BASE_ORIGIN).origin === SYNTHETIC_BASE_ORIGIN
  } catch {
    return false
  }
}

function isValidTransactionShape(value: unknown): value is OidcAuthorizationTransaction {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.state === 'string' &&
    candidate.state.length > 0 &&
    typeof candidate.nonce === 'string' &&
    candidate.nonce.length > 0 &&
    typeof candidate.codeVerifier === 'string' &&
    candidate.codeVerifier.length > 0 &&
    typeof candidate.redirectUri === 'string' &&
    candidate.redirectUri.length > 0 &&
    isSafeReturnTo(candidate.returnTo) &&
    (candidate.silent === undefined || typeof candidate.silent === 'boolean')
  )
}

/**
 * Persists the transaction that must survive the full-page redirect to the
 * provider and back. Rebuilds a clean object from exactly the five
 * documented fields — never spreads the input — so nothing else (an
 * access/id/refresh token, UserInfo) can ever end up in sessionStorage,
 * even by an accidental extra property on the caller's object.
 */
export function saveAuthorizationTransaction(
  transaction: OidcAuthorizationTransaction,
): void {
  if (!isSafeReturnTo(transaction.returnTo)) {
    throw new Error(
      'OidcAuthorizationTransaction.returnTo must be a safe, same-origin application path.',
    )
  }

  const clean: OidcAuthorizationTransaction = {
    state: transaction.state,
    nonce: transaction.nonce,
    codeVerifier: transaction.codeVerifier,
    redirectUri: transaction.redirectUri,
    returnTo: transaction.returnTo,
    // Omitted entirely (never written as `false`) for a normal visible
    // request, so existing stored/round-tripped transactions stay
    // byte-identical to before this field existed.
    ...(transaction.silent ? { silent: true as const } : {}),
  }

  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(clean))
}

/**
 * Reads and removes the stored transaction in one step — the transaction
 * is consumed exactly once, whether or not it turns out to be valid.
 * Malformed JSON, an unexpected shape, or an unsafe `returnTo` all resolve
 * to `null` rather than throwing, so callback handling can treat every
 * failure mode identically ("no matching transaction").
 */
export function consumeAuthorizationTransaction(): OidcAuthorizationTransaction | null {
  const raw = sessionStorage.getItem(STORAGE_KEY)
  sessionStorage.removeItem(STORAGE_KEY)

  if (raw === null) {
    return null
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  return isValidTransactionShape(parsed) ? parsed : null
}

/** Explicitly discards any stored transaction without attempting to read it — used to clear stale/terminal state on an unrecoverable callback path. */
export function clearAuthorizationTransaction(): void {
  sessionStorage.removeItem(STORAGE_KEY)
}
