const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function storageKey(codigoQr: string): string {
  return `sgeb:token:${codigoQr}`
}

/**
 * Keyed per-QR (not global), exactly as documented by the backend owner
 * (`docs/api/RESPUESTAS-frontend-FINAL.md` §"token_comensal — solo el
 * POST"): a diner visiting two different events' tables from the same
 * browser gets one `token_comensal` per table, and revisiting the same
 * table reuses the same token — which is also what makes the backend's
 * duplicate-rating check (SGEB-4010, a real DB `UNIQUE` constraint) mean
 * "one rating per browser per table," not "one rating ever, globally."
 * Structural validation only (UUID v4 shape) so corrupted/tampered storage
 * content is never fed back into a request; there is no server-side way to
 * validate a stored token ahead of time.
 */
export function readStoredTokenComensal(codigoQr: string): string | undefined {
  const raw = window.localStorage.getItem(storageKey(codigoQr))
  return raw && UUID_V4.test(raw) ? raw : undefined
}

export function writeStoredTokenComensal(codigoQr: string, tokenComensal: string): void {
  window.localStorage.setItem(storageKey(codigoQr), tokenComensal)
}

function ratingSubmittedStorageKey(codigoQr: string): string {
  return `sgeb:calificacion-enviada:${codigoQr}`
}

/**
 * A purely local UX shortcut, keyed per-QR like the token above — NEVER
 * the source of truth for duplicate protection (the backend's `UNIQUE`
 * constraint / SGEB-4010 remains that; clearing this browser's storage,
 * or rating from a different browser, can show the form again, and the
 * backend still rejects the duplicate). Set only after a CONFIRMED
 * backend outcome — a successful `POST /calificaciones`, or its
 * SGEB-4010 "already rated" response — never merely because a
 * `token_comensal` exists, since a token is issued before the rating
 * is known to succeed.
 */
export function hasSubmittedRating(codigoQr: string): boolean {
  return window.localStorage.getItem(ratingSubmittedStorageKey(codigoQr)) === '1'
}

export function markRatingSubmitted(codigoQr: string): void {
  window.localStorage.setItem(ratingSubmittedStorageKey(codigoQr), '1')
}
