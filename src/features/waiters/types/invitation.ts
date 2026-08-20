/**
 * UI domain types for waiter invitations, confirmed directly against the
 * pinned backend's `Invitacion` model (`app/modules/identidad/models/invitacion.ts`),
 * `InvitacionService`/`InvitacionesController`
 * (`app/modules/identidad/services/invitacion_service.ts`,
 * `.../controllers/invitaciones_controller.ts`), and
 * `docs/api/RESPUESTAS-frontend-FINAL.md` §4 ("las invitaciones ya están
 * expuestas"). This is the ONLY way a waiter account is created — there is
 * no self-registration; see this branch's report.
 *
 * `estado` includes the server-derived `'expirada'` value: the DB column
 * only ever persists `pendiente|usada|revocada`, and `InvitacionService.listar`
 * computes `expirada` at read time by comparing `expira_en` to now — never
 * persisted, never something this feature re-derives itself.
 */
export type InvitationStatus = 'pendiente' | 'usada' | 'expirada' | 'revocada'

export interface InvitationViewModel {
  idInvitacion: number
  nombreCompleto: string
  correo: string
  estado: InvitationStatus
  expiraEn: string
  creadoEn: string
}

/**
 * `POST /usuarios/invitaciones` request body — exact field set confirmed
 * against the pinned backend's `crearValidator`
 * (`invitaciones_controller.ts`). No `telefono` field: unlike the W-04
 * wireframe (phone-only), the real, live validator has no phone field at
 * all — see `schemas/invitationSchema.ts`. `idRolDestino` is resolved by
 * the caller from the real `GET /roles` catalog (`services/rolesApi.ts`),
 * matching `nombre === 'mesero'` — never a hardcoded id, even though the
 * seed order (`database/migrations/1800000001_create_usuarios_y_roles.ts`)
 * happens to be stable.
 */
export interface CreateInvitationRequest {
  idRolDestino: number
  nombre: string
  apellidoPaterno: string
  apellidoMaterno?: string | null
  correo: string
}

/**
 * The one-time result of a successful invitation creation/resend.
 * `deeplink` is returned exactly once by the server and never retrievable
 * again from any list/read endpoint (`InvitacionService.invitar`'s own
 * comment: "El deeplink se devuelve UNA vez") — the UI must capture and
 * let the caller copy it immediately.
 */
export interface InvitationDeeplinkResult {
  correo?: string
  deeplink: string
  expiraEn: string
}
