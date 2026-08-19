import { z } from 'zod'

import type { EventCreateFormValues } from '@/features/events/schemas/eventCreateSchema'

/** Narrowly-scoped sessionStorage key — never localStorage (see ADR-002's same reasoning for the OIDC transaction this mirrors). */
const STORAGE_KEY = 'sgeb:event-create:auth-recovery-draft'

const DRAFT_VERSION = 1

/**
 * How long a saved draft remains eligible for automatic restoration. No
 * existing "form draft" TTL convention exists elsewhere in this codebase to
 * reuse — the closest analogues (the PKCE authorization transaction, a
 * comanda signed URL) are protocol/security artifacts with their own
 * unrelated lifetimes, not a precedent for "how long is a paused write
 * still relevant." Chosen deliberately generous relative to the access
 * token lifetime seen throughout this module's own tests (`expires_in:
 * 900`, 15 minutes): 10 minutes comfortably covers a real
 * `prompt=none` round trip, including the one bounded automatic fallback to
 * a VISIBLE login (password + 2FA) if the silent attempt itself turns out
 * to need one, while staying short enough that a draft from a genuinely
 * abandoned attempt earlier in the same tab's life is never resurrected
 * much later and presented as if it just happened.
 */
const DRAFT_TTL_MS = 10 * 60 * 1000

/**
 * Structural validation only — deliberately looser than
 * `createEventFormSchema` (`schemas/eventCreateSchema.ts`), which requires
 * the live `salones` list to enforce its cross-field business rules
 * (SGEB-4007 capacity, salón existence). A restored draft has no such list
 * available at the point it's read back out of storage; the same real
 * validation still runs naturally the moment RHF/zod re-validates the
 * restored values against the live salones on the next interaction or
 * submit. This schema exists only to reject corrupted/tampered storage
 * content, never to re-enforce business rules.
 */
const eventCreateDraftValuesSchema = z.object({
  id_salon: z.number(),
  titulo: z.string(),
  tipo: z.enum(['social', 'empresarial']),
  fecha: z.string(),
  hora_presentacion: z.string(),
  hora_inicio: z.string(),
  cupo_meseros: z.number(),
  num_mesas: z.number(),
  tarifa_por_mesero: z.number(),
  radio_geocerca_m: z.number(),
}) satisfies z.ZodType<EventCreateFormValues>

const eventCreateDraftEnvelopeSchema = z.object({
  version: z.literal(DRAFT_VERSION),
  savedAt: z.number(),
  values: eventCreateDraftValuesSchema,
})

export type EventCreateDraftEnvelope = z.infer<typeof eventCreateDraftEnvelopeSchema>

/**
 * Persists the CURRENT Event Create form values (the RHF/zod UI model —
 * `EventCreateFormValues`, snake_case — never the translated camelCase
 * `POST /eventos` wire request) so they survive the full-page OIDC
 * navigation triggered when a write fails because auth expired and the
 * normal refresh attempt also failed (`EventCreatePage`'s own recovery
 * orchestration — this module never triggers navigation itself).
 *
 * Returns `false` without throwing when sessionStorage itself is
 * unavailable or the write fails (quota exceeded, private-browsing
 * restrictions, storage disabled) — the caller must treat that as "the
 * draft was NOT saved" and must never navigate away while implying
 * otherwise; see `EventCreatePage`'s "no pudimos conservar..." fallback.
 */
export function saveEventCreateDraft(values: EventCreateFormValues): boolean {
  const envelope: EventCreateDraftEnvelope = {
    version: DRAFT_VERSION,
    savedAt: Date.now(),
    values,
  }
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(envelope))
    return true
  } catch {
    return false
  }
}

/**
 * Reads and removes the stored draft in one step — consumed at most once,
 * whether or not it turns out to be valid, mirroring
 * `authorizationTransaction.ts`'s own consume-once contract. Malformed
 * JSON, an unexpected/tampered shape, an unsupported `version`, or a
 * snapshot older than `DRAFT_TTL_MS` all resolve to `null` rather than
 * throwing, so `EventCreatePage` can treat every failure mode identically
 * ("no draft to restore — behave like a normal, empty Create Event visit").
 */
export function consumeEventCreateDraft(): EventCreateFormValues | null {
  let raw: string | null
  try {
    raw = sessionStorage.getItem(STORAGE_KEY)
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    return null
  }

  if (raw === null) {
    return null
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  const result = eventCreateDraftEnvelopeSchema.safeParse(parsed)
  if (!result.success) {
    return null
  }

  if (Date.now() - result.data.savedAt > DRAFT_TTL_MS) {
    return null
  }

  return result.data.values
}

/**
 * Explicitly discards any stored draft without attempting to read/restore
 * it — used after a successful `POST /eventos` so a stale, unrelated
 * earlier draft can never resurface on a later visit to this page.
 */
export function clearEventCreateDraft(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Best-effort cleanup only — nothing to recover from here, and the
    // stale draft (if any) still safely expires via DRAFT_TTL_MS.
  }
}
