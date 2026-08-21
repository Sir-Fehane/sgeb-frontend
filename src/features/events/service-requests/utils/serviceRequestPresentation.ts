import type { Tone } from '@/shared/components'
import type {
  ServiceRequestStatus,
  ServiceRequestType,
} from '@/features/events/service-requests/types/serviceRequest'

export const SERVICE_REQUEST_TYPE_LABELS: Record<ServiceRequestType, string> = {
  atencion: 'Atención',
  cuenta: 'Cuenta',
  otro: 'Otro',
}

export const SERVICE_REQUEST_STATUS_LABELS: Record<ServiceRequestStatus, string> = {
  pendiente: 'Pendiente',
  atendida: 'Atendida',
  cancelada: 'Cancelada',
}

export const SERVICE_REQUEST_STATUS_TONES: Record<ServiceRequestStatus, Tone> = {
  pendiente: 'warning',
  atendida: 'success',
  cancelada: 'neutral',
}

/** `creada_en`/`atendida_en` — a full date-time string, formatted the same way `formatMermaReportDate` (Closure) does. Each feature owns its own tiny formatter — same precedent that file's comment documents. */
export function formatServiceRequestDateTime(dateTime: string): string {
  return new Date(dateTime).toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
