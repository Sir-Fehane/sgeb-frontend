/**
 * UI domain types for the anonymous public diner (comensal) experience.
 * Confirmed against the pinned backend's actual routes/controllers/tests
 * (`sgeb-backend` branch `hotfix/local-db-ssl`,
 * `app/modules/eventos/controllers/publico_controller.ts` and
 * `app/modules/comensal/controllers/comensal_controller.ts`), not just the
 * OpenAPI doc — the doc's inline response schema for `GET
 * /publico/mesas/{codigo_qr}` lists `mesero`/`token_comensal` fields the
 * real controller never sends; those fields do not exist anywhere in this
 * feature. This feature is architecturally independent of the
 * authenticated captain/admin console — no SSO, no Bearer token, no
 * derived role, no shared Zustand session store.
 */

/** `EVENTO.estado` lifecycle — mirrors the backend's own `EventoEstado` union. `GET /publico/mesas/{codigo_qr}` only ever resolves while the event is `publicado`/`en_curso` (any other state 404s as an unknown QR before this value could be observed), but the full union is kept here rather than narrowed, since nothing about this type asserts that access rule. */
export type PublicDinerEventoEstado =
  'borrador' | 'publicado' | 'en_curso' | 'finalizado' | 'cancelado'

/**
 * Mirrors `GET /publico/mesas/{codigo_qr}`'s actual response `data` object
 * field-for-field (`PublicoController#mesa`) — no mesero data of any kind,
 * no `token_comensal` (that is issued only by the separate `POST
 * /publico/mesas/{codigo_qr}/token`, requested lazily when a rating is
 * about to be submitted — see `services/publicDinerApi.ts`).
 */
export interface PublicDinerTableViewModel {
  idMesa: number
  /** `etiqueta` — e.g. "Mesa 12". The only table-identifying text ever shown. */
  etiqueta: string
  evento: {
    idEvento: number
    titulo: string
    estado: PublicDinerEventoEstado
  }
}

/** `POST /publico/mesas/{codigo_qr}/solicitudes`'s documented `tipo` enum — only `atencion` is exposed by this UI (docs/decisions.md: no "Pedir cuenta", no "otro"). */
export type ServiceRequestType = 'atencion'

/**
 * The confirmed, product-approved payload for "Llamar al mesero" — no
 * `cuenta`, no `otro`, no free-text content (docs/decisions.md).
 */
export interface PublicDinerAttentionRequest {
  tipo: 'atencion'
}

/** Explicit UI states for the "Llamar al mesero" action — see `docs/errors/diccionario-errores-sgeb.md` SGEB-4014 for `throttled`. */
export type ServiceRequestStatus =
  'idle' | 'submitting' | 'success' | 'throttled' | 'error'

/** Explicit UI states for the rating form — SGEB-4010 (duplicate rating) maps to `already-submitted`. */
export type RatingStatus =
  'idle' | 'submitting' | 'success' | 'already-submitted' | 'error'

/**
 * Re-exported from `schemas/ratingSchema.ts` (the Zod schema is the
 * single source of truth for this shape, mirroring the established
 * `EventCreateFieldPrototypeValues` convention) so the rest of this
 * feature can import the form-values type from `types/` without
 * reaching into `schemas/` directly.
 */
export type { PublicDinerRatingValues } from '@/features/public-diner/schemas/ratingSchema'
