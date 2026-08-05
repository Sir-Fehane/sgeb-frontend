import { RecoveryRequestForm } from '@/features/auth/components/RecoveryRequestForm'
import { Alert } from '@/shared/components'
import { AuthLayout } from '@/shared/components/layout'

/** Routed at /recuperar (S5). */
export function RecoveryRequestPage() {
  function handleSubmit() {
    // Dev-only no-op — see LoginPage's equivalent notice.
  }

  return (
    <AuthLayout
      title="Recuperar acceso"
      description="Te enviaremos un enlace a tu correo."
    >
      <Alert tone="info" title="Integración con SSO pendiente">
        Este formulario todavía no se conecta al servicio de autenticación.
      </Alert>
      <RecoveryRequestForm onSubmit={handleSubmit} />
    </AuthLayout>
  )
}
