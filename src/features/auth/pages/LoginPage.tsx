import { LoginForm } from '@/features/auth/components/LoginForm'
import { Alert } from '@/shared/components'
import { AuthLayout } from '@/shared/components/layout'

/**
 * Routed at /login (S1) — shared by `admin` and `capitan`
 * (docs/FrontendArchitecture.md §5.1). The submit handler is a dev-only
 * no-op: SSO integration, token handling, and role-based redirects are
 * explicitly out of scope for this branch (§10.1, §18).
 */
export function LoginPage() {
  function handleSubmit() {
    // Dev-only no-op — no request is sent and no session is created.
    // See the pending-integration notice rendered below.
  }

  return (
    <AuthLayout title="Iniciar sesión" description="Panel del Capitán y Administrador">
      <Alert tone="info" title="Integración con SSO pendiente">
        Este formulario todavía no se conecta al servicio de autenticación. Nadie queda
        autenticado al enviarlo.
      </Alert>
      <LoginForm onSubmit={handleSubmit} />
    </AuthLayout>
  )
}
