import type { Tone } from '@/shared/components'

/**
 * Generic wrapper for the server's already-final-copy feedback message
 * (docs/FrontendArchitecture.md §4.1 — `result.message`, never
 * `technical_message`, no client-side code→message table). `tone` is
 * derived by the future integration layer from the HTTP status range
 * (2xx/4xx/5xx), not by this feature.
 */
export interface AuthServerFeedback {
  tone: Tone
  message: string
}

/**
 * Shape a real login flow would pass via router `state` when
 * `POST /auth/login` responds `estado: "verificacion_requerida"`
 * (docs/sso/openapi-sso (1).yaml `VerificacionRequerida`). Nothing on
 * this branch produces this state yet (no API integration) — see
 * `TwoFactorPage`'s fallback for direct navigation without it.
 */
export interface TwoFactorLocationState {
  ticket2fa: string
  correoEnmascarado?: string
  expiraEnSegundos?: number
}
