/**
 * `GET /roles` — the real, fixed role catalog (`Rol` model,
 * `app/modules/identidad/models/rol.ts`). Used only to resolve the
 * mesero role's real `id_rol` for the invite flow, never to build a
 * generic role picker — see `WaitersInviteForm`'s own comment for why
 * this screen only ever invites `mesero`.
 */
export interface RoleViewModel {
  idRol: number
  nombre: 'admin' | 'capitan' | 'mesero'
}
