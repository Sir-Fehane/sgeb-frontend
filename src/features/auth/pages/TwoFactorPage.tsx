import { Link, useLocation } from 'react-router-dom'

import { TwoFactorForm } from '@/features/auth/components/TwoFactorForm'
import type { TwoFactorLocationState } from '@/features/auth/types/auth'
import { Alert } from '@/shared/components'
import { AuthLayout } from '@/shared/components/layout'

function isTwoFactorLocationState(state: unknown): state is TwoFactorLocationState {
  return (
    typeof state === 'object' &&
    state !== null &&
    'ticket2fa' in state &&
    typeof state.ticket2fa === 'string'
  )
}

/**
 * Routed at /verificacion-2fa — the still-undesigned web adaptation of S3
 * (docs/FrontendArchitecture.md §9, §19 item 6). A real login flow would
 * eventually navigate here with router `state` after `POST /auth/login`
 * responds `estado: "verificacion_requerida"`. Nothing on this branch
 * produces that state yet, so direct navigation shows a fallback instead
 * of a fake active verification session.
 */
export function TwoFactorPage() {
  const location = useLocation()
  const state = isTwoFactorLocationState(location.state) ? location.state : null

  function handleSubmit() {
    // Dev-only no-op — see LoginPage's equivalent notice.
  }

  function handleResend() {
    // Dev-only no-op.
  }

  if (!state) {
    return (
      <AuthLayout title="Verificación en dos pasos">
        <Alert tone="info" title="No hay una verificación en curso">
          Inicia sesión primero para recibir un código de verificación.
        </Alert>
        <Link
          to="/login"
          className="text-body-sm text-primary text-center font-sans underline-offset-4 hover:underline"
        >
          Ir a iniciar sesión
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Verificación en dos pasos"
      description="Adaptación web provisional de S3 — pendiente de diseño final."
    >
      <Alert tone="info" title="Integración con SSO pendiente">
        Este formulario todavía no se conecta al servicio de autenticación.
      </Alert>
      <TwoFactorForm
        correoEnmascarado={state.correoEnmascarado}
        expiraEnSegundos={state.expiraEnSegundos}
        onSubmit={handleSubmit}
        onResend={handleResend}
      />
    </AuthLayout>
  )
}
