import { SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'
import type {
  CreateInvitationRequest,
  InvitationDeeplinkResult,
  InvitationStatus,
  InvitationViewModel,
} from '@/features/waiters/types/invitation'

/**
 * Wire shape of one row in `GET /usuarios/invitaciones` (and the
 * `DELETE .../{id}` revoke response) — confirmed against `Invitacion`'s
 * own `@column` declarations (`app/modules/identidad/models/invitacion.ts`).
 * `id_emisor`/`token_hash` never serialize (`serializeAs: null`) — the
 * server never exposes who sent it or any form of the token, even hashed
 * (`InvitacionService.listar`'s own comment).
 */
export interface InvitacionApiRecord {
  id_invitacion: number
  id_rol_destino: number
  nombre: string
  apellido_paterno: string
  apellido_materno: string | null
  correo: string
  estado: InvitationStatus
  expira_en: string
  id_usuario_creado: number | null
  usada_en: string | null
  creado_en: string
}

export interface InvitationsListParams {
  estado?: InvitationStatus
}

function mapInvitacion(record: InvitacionApiRecord): InvitationViewModel {
  const apellidos = [record.apellido_paterno, record.apellido_materno]
    .filter((value): value is string => Boolean(value))
    .join(' ')
  return {
    idInvitacion: record.id_invitacion,
    nombreCompleto: `${record.nombre} ${apellidos}`.trim(),
    correo: record.correo,
    estado: record.estado,
    expiraEn: record.expira_en,
    creadoEn: record.creado_en,
  }
}

/**
 * Fetches real invitations (`GET /usuarios/invitaciones`) through the
 * shared authenticated SGEB transport. `mias` is deliberately never sent:
 * the pinned backend already auto-scopes a `capitan` session to its own
 * invitations regardless (`InvitacionesController.listar`), and an admin
 * session seeing every invitation is the documented default — sending
 * `mias=true` would only narrow an admin's own view with no real UI
 * control asking for that.
 */
export async function fetchInvitations(
  params: InvitationsListParams,
  signal?: AbortSignal,
): Promise<InvitationViewModel[]> {
  const envelope = await requestSgeb<InvitacionApiRecord[]>({
    url: '/usuarios/invitaciones',
    params: params as Record<string, unknown>,
    ...(signal ? { signal } : {}),
  })
  return (envelope.data ?? []).map(mapInvitacion)
}

/**
 * `POST /usuarios/invitaciones` — sends the invitation email and returns
 * the one-time deeplink. See `types/invitation.ts`'s `InvitationDeeplinkResult`
 * for why this must be captured and shown immediately.
 */
export async function createInvitation(
  request: CreateInvitationRequest,
): Promise<InvitationDeeplinkResult> {
  const envelope = await requestSgeb<{
    correo: string
    deeplink: string
    expira_en: string
  }>({
    url: '/usuarios/invitaciones',
    method: 'POST',
    data: request,
  })
  if (envelope.data === null) {
    // Never observed against the pinned backend — a successful creation
    // always returns `{correo, deeplink, expira_en}` — guarded defensively
    // rather than assumed, same convention as `features/events/services/eventsApi.ts`.
    throw new SgebNetworkError('No pudimos interpretar la respuesta del servidor.')
  }
  return {
    correo: envelope.data.correo,
    deeplink: envelope.data.deeplink,
    expiraEn: envelope.data.expira_en,
  }
}

/**
 * `DELETE /usuarios/invitaciones/{id}` — revokes a pending invitation and
 * frees its correo for reinviting (`InvitacionService.revocar`). Idempotent
 * on an already-revoked invitation (server-side); rejects with `SSO-3002`
 * if the invitation was already used (a real account already exists — the
 * caller is expected to recognize this and point at `PATCH /usuarios/{uuid}`
 * instead, per the server's own error message).
 */
export async function revokeInvitation(
  idInvitacion: number,
): Promise<InvitationViewModel> {
  const envelope = await requestSgeb<InvitacionApiRecord>({
    url: `/usuarios/invitaciones/${String(idInvitacion)}`,
    method: 'DELETE',
  })
  if (envelope.data === null) {
    throw new SgebNetworkError('No pudimos interpretar la respuesta del servidor.')
  }
  return mapInvitacion(envelope.data)
}

/**
 * `POST /usuarios/invitaciones/{id}/reenviar` — revokes the previous
 * invitation and issues a brand-new token/72h window
 * (`InvitacionService.reenviar`). Returns only `{deeplink, expira_en}`
 * (no `correo`, unlike `createInvitation`'s response) — confirmed against
 * `InvitacionesController.reenviar`'s literal `responder.creado(ctx, {
 * deeplink: r.deeplink, expira_en: r.expiraEn })`.
 */
export async function resendInvitation(
  idInvitacion: number,
): Promise<InvitationDeeplinkResult> {
  const envelope = await requestSgeb<{ deeplink: string; expira_en: string }>({
    url: `/usuarios/invitaciones/${String(idInvitacion)}/reenviar`,
    method: 'POST',
  })
  if (envelope.data === null) {
    throw new SgebNetworkError('No pudimos interpretar la respuesta del servidor.')
  }
  return { deeplink: envelope.data.deeplink, expiraEn: envelope.data.expira_en }
}
