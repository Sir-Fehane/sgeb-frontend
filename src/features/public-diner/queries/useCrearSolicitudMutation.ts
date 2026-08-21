import { useMutation } from '@tanstack/react-query'

import { crearSolicitud } from '@/features/public-diner/services/publicDinerApi'

/**
 * `POST /publico/mesas/{codigo_qr}/solicitudes` for "Llamar al mesero" —
 * always `{ tipo: 'atencion' }` (docs/decisions.md: no other type is
 * exposed by this UI). No optimistic update and no cache invalidation:
 * there is no readback query for a diner's own solicitud (confirmed
 * absent from the pinned backend), so success is communicated purely
 * through this mutation's own state — the caller
 * (`PublicDinerPage`) derives `ServiceRequestStatus` from
 * `status`/`error.code` directly. No client-side duplicate-submit guard
 * either: the server's own anti-spam rule (`SGEB-4014`, one pending
 * solicitud per table) is the actual source of truth, surfaced here as
 * the `throttled` status rather than reimplemented client-side.
 */
export function useCrearSolicitudMutation(codigoQr: string) {
  return useMutation({
    mutationFn: () => crearSolicitud(codigoQr, 'atencion'),
  })
}
