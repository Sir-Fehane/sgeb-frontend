import type { Tone } from '@/shared/components'
import type { InvitationStatus } from '@/features/waiters/types/invitation'

/** Presentational label + tone for each documented `Invitacion.estado` value (including the server-derived `expirada`). */
export const INVITATION_STATUS_LABELS: Record<InvitationStatus, string> = {
  pendiente: 'Pendiente',
  usada: 'Registrada',
  expirada: 'Expirada',
  revocada: 'Revocada',
}

export const INVITATION_STATUS_TONES: Record<InvitationStatus, Tone> = {
  pendiente: 'info',
  usada: 'success',
  expirada: 'warning',
  revocada: 'neutral',
}
