import { Alert } from '@/shared/components'

/**
 * Rendered instead of ever firing `GET /eventos/{id}/pagos` (or the closure
 * readiness/roster reads it depends on) for a `mesero` session — same
 * "still handle a direct-URL visit honestly, without depending on a real
 * round trip to say so" pattern `UsersForbiddenState`/`WaitersForbiddenState`
 * establish. Every payments endpoint (`GET .../pagos`, `POST .../calcular`,
 * `PATCH /pagos/{id}/pagado`, `PATCH /pagos/{id}/fallido`) is
 * `capitán`/`admin`-only on the pinned backend
 * (`middleware.rol(['capitan', 'admin'])`).
 */
export function EventPaymentsForbiddenState() {
  return (
    <Alert tone="warning" title="No tienes permiso para ver esta sección">
      <p>
        Los pagos de este evento están disponibles solo para capitanes y administradores.
      </p>
    </Alert>
  )
}
