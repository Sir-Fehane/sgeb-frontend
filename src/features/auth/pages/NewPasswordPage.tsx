import { NewPasswordForm } from '@/features/auth/components/NewPasswordForm'
import { Alert } from '@/shared/components'
import { AuthLayout } from '@/shared/components/layout'

/**
 * Routed at /recuperar/:token (S6). The route's `token` param exists
 * purely for a future API call — nothing here reads, displays, or logs
 * it, since no request is made on this branch (no `GET
 * /auth/recuperacion/{token}` validation, no restablecer call).
 */
export function NewPasswordPage() {
  function handleSubmit() {
    // Dev-only no-op — see LoginPage's equivalent notice.
  }

  return (
    <AuthLayout title="Crea una nueva contraseña">
      <Alert tone="info" title="Integración con SSO pendiente">
        Este formulario todavía no se conecta al servicio de autenticación.
      </Alert>
      <NewPasswordForm onSubmit={handleSubmit} />
    </AuthLayout>
  )
}
