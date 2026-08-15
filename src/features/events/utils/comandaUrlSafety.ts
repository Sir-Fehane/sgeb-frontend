/**
 * Runtime guard for the fresh `url` returned by
 * `GET /eventos/{id_evento}/comanda` (`services/comandaApi.ts`'s
 * `fetchComandaAccess`) — NEVER for `Evento.comanda_url`, which is an
 * internal object-storage key that must never be treated as a candidate
 * URL at all (`docs/decisions.md` ADR-007; see `types/event.ts`'s and
 * `services/eventsApi.ts`'s comments for why that field has no live
 * mapping anywhere in this feature).
 *
 * The real backend returns exactly two shapes for this field:
 * - Production/S3: a genuine `https://` (or `http://` in a non-TLS
 *   deployment) presigned URL, safe to open directly in a new tab.
 * - Local/dev storage: a `local://{clave}` pseudo-URL — not
 *   browser-navigable at all; the caller must fall back to the
 *   authenticated binary proxy (`GET .../comanda/archivo` via
 *   `requestSgebBinary`) instead. See `queries/useOpenComandaMutation.ts`.
 *
 * `isSafeComandaUrl` accepts only the first shape. Everything else —
 * `local://`, a missing/`null` value, or any malformed string — is
 * treated as "not safely navigable," never guessed at or patched up.
 */
const SAFE_COMANDA_ACCESS_URL_PATTERN = /^https?:\/\/[^\s]{1,2048}$/

export function isSafeComandaUrl(url: string | null | undefined): url is string {
  if (url === null || url === undefined) {
    return false
  }
  return SAFE_COMANDA_ACCESS_URL_PATTERN.test(url)
}
