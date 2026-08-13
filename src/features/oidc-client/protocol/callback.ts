import { exchangeAuthorizationCode } from '@/features/oidc-client/client/tokenClient'
import { fetchUserInfo } from '@/features/oidc-client/client/userInfoClient'
import { consumeAuthorizationTransaction } from '@/features/oidc-client/storage/authorizationTransaction'
import type { OidcAuthenticatedSession } from '@/features/oidc-client/types/session'
import { getSafeOAuthErrorMessage } from '@/features/oidc-client/utils/safeOAuthErrorMessage'

const SAFE_INVALID_CALLBACK_MESSAGE =
  'No pudimos completar el inicio de sesión. Vuelve a intentarlo.'

export interface CallbackQueryParams {
  code: string | null
  state: string | null
  error: string | null
}

export type CallbackOutcome =
  | {
      kind: 'success'
      returnTo: string
      session: Omit<OidcAuthenticatedSession, 'status'>
    }
  | { kind: 'error'; message: string; canRestart: boolean }
  /**
   * The one bounded exception to "never silently retry": a cold-start
   * silent-restore attempt (`protocol/bootstrap.ts`, `prompt=none`) came
   * back with the documented, expected `login_required` response — not a
   * real error, per `RESPUESTAS-frontend-FINAL.md` ("No es error: es la
   * respuesta esperada de la renovación silenciosa en web"). The caller
   * should immediately start a normal, VISIBLE authorization request
   * instead of showing an error screen. Only ever produced when the
   * consumed transaction itself was marked `silent` — a normal, visible
   * flow's own `login_required` (which should not happen, but is not
   * trusted to never happen) still falls through to a real error, so this
   * can never chain into a second automatic redirect.
   */
  | { kind: 'retry-visible' }

export interface ProcessCallbackDependencies {
  consumeTransaction?: typeof consumeAuthorizationTransaction
  exchange?: typeof exchangeAuthorizationCode
  loadUserInfo?: typeof fetchUserInfo
}

/**
 * Pure orchestration for `/auth/callback` — no React, no DOM, no
 * navigation. Returns a result the routed page renders/acts on; never
 * throws for an expected failure mode (all of them resolve to `{ kind:
 * 'error' }`).
 *
 * `consumeAuthorizationTransaction()` removes the stored transaction on
 * its first read regardless of outcome, which is what makes "exchange
 * attempted once" and "the code is one-use" hold even if this function
 * were somehow invoked twice for the same callback (e.g. a duplicate
 * effect run): the second call always finds no transaction and stops
 * before ever calling `/token` again.
 */
export async function processAuthorizationCallback(
  params: CallbackQueryParams,
  deps: ProcessCallbackDependencies = {},
): Promise<CallbackOutcome> {
  const consumeTransaction = deps.consumeTransaction ?? consumeAuthorizationTransaction
  const exchange = deps.exchange ?? exchangeAuthorizationCode
  const loadUserInfo = deps.loadUserInfo ?? fetchUserInfo

  // Provider error callback (error / error_description / state). The
  // specific mapped message is only trusted when `state` matches a
  // stored transaction — otherwise `error` could be injected by anyone
  // (e.g. a crafted link with no real /authorize round-trip behind it)
  // and must not be presented as if it were a genuine, verified provider
  // response. Either way the transaction is cleared — it can never be
  // reused.
  if (params.error) {
    const transaction = consumeTransaction()
    const isVerifiedProviderError =
      transaction !== null && params.state === transaction.state

    if (
      isVerifiedProviderError &&
      transaction.silent &&
      params.error === 'login_required'
    ) {
      return { kind: 'retry-visible' }
    }

    return {
      kind: 'error',
      message: isVerifiedProviderError
        ? getSafeOAuthErrorMessage(params.error)
        : SAFE_INVALID_CALLBACK_MESSAGE,
      canRestart: true,
    }
  }

  // Invalid: missing code or missing state — never call /token.
  if (!params.code || !params.state) {
    consumeTransaction()
    return { kind: 'error', message: SAFE_INVALID_CALLBACK_MESSAGE, canRestart: true }
  }

  const transaction = consumeTransaction()

  // No matching stored transaction (never began here, or already consumed).
  if (!transaction) {
    return { kind: 'error', message: SAFE_INVALID_CALLBACK_MESSAGE, canRestart: true }
  }

  // Mismatched state — never call /token with an unverified transaction.
  if (transaction.state !== params.state) {
    return { kind: 'error', message: SAFE_INVALID_CALLBACK_MESSAGE, canRestart: true }
  }

  const exchangeResult = await exchange({
    code: params.code,
    redirectUri: transaction.redirectUri,
    codeVerifier: transaction.codeVerifier,
  })

  if (exchangeResult.outcome === 'oauth-error') {
    return {
      kind: 'error',
      message: getSafeOAuthErrorMessage(exchangeResult.error.error),
      canRestart: true,
    }
  }
  if (exchangeResult.outcome === 'network-error') {
    return { kind: 'error', message: exchangeResult.message, canRestart: true }
  }

  const token = exchangeResult.token
  const accessTokenExpiresAt = Date.now() + token.expires_in * 1000

  const userInfoResult = await loadUserInfo(token.access_token)

  if (userInfoResult.outcome === 'oauth-error') {
    return {
      kind: 'error',
      message: getSafeOAuthErrorMessage(userInfoResult.error.error),
      canRestart: true,
    }
  }
  if (userInfoResult.outcome === 'network-error') {
    return { kind: 'error', message: userInfoResult.message, canRestart: true }
  }
  if (userInfoResult.outcome === 'invalid-response') {
    return { kind: 'error', message: userInfoResult.message, canRestart: true }
  }

  return {
    kind: 'success',
    returnTo: transaction.returnTo,
    session: {
      accessToken: token.access_token,
      accessTokenExpiresAt,
      user: userInfoResult.user,
      ...(token.id_token ? { idToken: token.id_token } : {}),
      ...(token.scope ? { scope: token.scope } : {}),
    },
  }
}
