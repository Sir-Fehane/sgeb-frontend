import type { OAuthErrorCode } from '@/features/oidc-client/types/protocol'

/**
 * Safe, local presentation for each documented `ErrorOAuth.error` value
 * (`docs/sso/diccionario-errores-sso.md` §8's correspondence table).
 * Never derived from `error_description` or `sso_code` — both may contain
 * detail the provider explicitly reserves for support/debugging, not the
 * end user (see the dictionary's own rule 3: "Nunca mostrar
 * technical_message al usuario final").
 */
const SAFE_MESSAGES: Record<OAuthErrorCode, string> = {
  invalid_request: 'No pudimos completar el inicio de sesión. Vuelve a intentarlo.',
  invalid_client:
    'No pudimos identificar la aplicación que solicita el acceso. Contacta a soporte si el problema continúa.',
  invalid_grant: 'No pudimos completar el inicio de sesión. Vuelve a intentarlo.',
  unauthorized_client: 'No pudimos completar el inicio de sesión. Vuelve a intentarlo.',
  unsupported_grant_type:
    'No pudimos completar el inicio de sesión. Vuelve a intentarlo.',
  invalid_scope: 'No pudimos completar el inicio de sesión. Vuelve a intentarlo.',
  access_denied: 'Tu cuenta está desactivada. Contacta a tu capitán.',
  login_required: 'Necesitas iniciar sesión para continuar.',
  server_error: 'Ocurrió un problema inesperado. Intenta de nuevo en unos minutos.',
  temporarily_unavailable:
    'El sistema está en mantenimiento. Vuelve a intentarlo más tarde.',
}

const FALLBACK_MESSAGE = 'No pudimos completar el inicio de sesión. Vuelve a intentarlo.'

/**
 * Maps a provider `error` code to safe, user-facing copy. Any value this
 * branch doesn't recognize (a future protocol addition, a malformed
 * response) falls back to the same generic restart message rather than
 * ever surfacing the raw code or description.
 */
export function getSafeOAuthErrorMessage(error: string | undefined): string {
  if (error !== undefined && error in SAFE_MESSAGES) {
    return SAFE_MESSAGES[error as OAuthErrorCode]
  }
  return FALLBACK_MESSAGE
}
