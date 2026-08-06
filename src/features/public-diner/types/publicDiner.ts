/**
 * UI domain types for the anonymous public diner (comensal) experience,
 * derived from docs/api/openapi-sgeb.yaml v1.6.0's `/publico/mesas/{codigo_qr}*`
 * endpoints. This feature is architecturally independent of the
 * authenticated captain/admin console — no SSO, no Bearer token, no
 * derived role, no shared Zustand session store.
 */

/**
 * Mirrors `GET /publico/mesas/{codigo_qr}`'s response `data` object
 * field-for-field. NOT an API DTO in the strict sense — the OpenAPI
 * schema documents this response inline (no named component schema),
 * so this is a direct transcription, not a `$ref`.
 */
export interface PublicDinerTableViewModel {
  /** `etiqueta` — e.g. "Mesa 12". The only table-identifying text ever shown. */
  etiqueta: string
  /** `mesero` — e.g. "Juan P.". The assigned waiter's display name only. */
  mesero: string
  /**
   * `token_comensal` — an opaque UUID that limits the diner to one
   * rating. Supplied internally to the page/container from the route's
   * data; NEVER rendered, never user-entered, never validated as an
   * identity, and never persisted to `localStorage`/`sessionStorage`
   * (browser-persistence ownership is an integration decision this
   * branch does not make — see the README's "Token ambiguity" note).
   */
  tokenComensal: string
}

/** `POST /publico/mesas/{codigo_qr}/solicitudes`'s documented `tipo` enum — only `atencion` is exposed by this UI. */
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
