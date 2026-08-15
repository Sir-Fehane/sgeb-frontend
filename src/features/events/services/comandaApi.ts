import type { ComandaMetadataViewModel } from '@/features/events/types/comanda'
import { isSgebApplicationError, SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb, requestSgebBinary } from '@/shared/api/sgebClient'

/**
 * Wire shape of the `Comanda` schema (`docs/api/openapi-sgeb.yaml`),
 * confirmed field-for-field against the pinned backend's
 * `comanda_evento.ts` model and `ComandaService`'s own responses.
 * `url`/`expira_en` are `null` on every response except a fresh
 * `GET /comanda` (openapi: "Solo viene en `GET /comanda`, no en el
 * historial") — modeled optional/nullable here rather than split into two
 * types, since both `mapComandaMetadata` and `mapComandaAccess` read from
 * this same wire shape, just different fields of it.
 */
export interface ComandaApiRecord {
  id_comanda: number
  id_evento: number
  nombre_original: string
  tipo_mime: string
  tamano_bytes: number
  activo: boolean
  creado_en: string
  url?: string | null
  expira_en?: string | null
}

/**
 * `SGEB-3001` — the same generic "not found" business code
 * `services/eventsApi.ts` uses for a missing event, returned here by
 * `ComandaService.obtener` (`errores.noEncontrado`, HTTP 404) when the
 * event has no active comanda. Scoped locally per docs/decisions.md
 * ADR-005 ("business codes belong to the feature that owns them"), same
 * as `eventsApi.ts`'s own `EVENT_NOT_FOUND_CODE` — not shared, even
 * though the literal value is identical, since the two features have no
 * other coupling.
 */
const COMANDA_NOT_FOUND_CODE = 'SGEB-3001'

/** True only for "this event has no active comanda" — as opposed to any other `SgebApplicationError`/`SgebNetworkError`. Not an error state; callers render the existing empty state. */
export function isComandaNotFoundError(error: unknown): boolean {
  return isSgebApplicationError(error) && error.code === COMANDA_NOT_FOUND_CODE
}

/**
 * Maps the STABLE fields only — deliberately excludes `url`/`expira_en`.
 * This is the shape cached by `useComandaQuery`; a signed URL must never
 * live in TanStack Query's cache (it expires in 15 minutes and would go
 * stale silently). See `mapComandaAccess` for the one-shot counterpart.
 */
function mapComandaMetadata(record: ComandaApiRecord): ComandaMetadataViewModel {
  return {
    idComanda: record.id_comanda,
    nombreOriginal: record.nombre_original,
    tipoMime: record.tipo_mime,
    tamanoBytes: record.tamano_bytes,
    activo: record.activo,
    creadoEn: record.creado_en,
  }
}

/**
 * Fetches the active comanda's stable metadata through the shared
 * authenticated SGEB transport. Lets `SgebApplicationError`/
 * `SgebNetworkError` propagate unchanged — including `SGEB-3001` (no
 * active comanda), which the caller (`useComandaQuery`) treats as "no
 * comanda" rather than a real error, same convention as
 * `isEventoNotFoundError`/`fetchEventoDetalle`.
 */
export async function fetchComandaMetadata(
  idEvento: number,
  signal?: AbortSignal,
): Promise<ComandaMetadataViewModel | null> {
  const envelope = await requestSgeb<ComandaApiRecord>({
    url: `/eventos/${String(idEvento)}/comanda`,
    ...(signal ? { signal } : {}),
  })
  return envelope.data === null ? null : mapComandaMetadata(envelope.data)
}

/** The one-shot pair this feature is allowed to use only immediately, never cache. */
export interface ComandaAccess {
  url: string | null
  expiraEn: string | null
}

/**
 * Fetches a FRESH signed-URL response — a distinct call from
 * `fetchComandaMetadata`, made only at "Abrir comanda" click time
 * (`queries/useOpenComandaMutation.ts`), never on page load and never
 * reused from any cache. `url` is `https://...` in production/S3, or the
 * non-navigable `local://...` placeholder in local/dev storage mode — see
 * `utils/comandaUrlSafety.ts` for how the caller must branch on it.
 */
export async function fetchComandaAccess(
  idEvento: number,
  signal?: AbortSignal,
): Promise<ComandaAccess> {
  const envelope = await requestSgeb<ComandaApiRecord>({
    url: `/eventos/${String(idEvento)}/comanda`,
    ...(signal ? { signal } : {}),
  })
  return {
    url: envelope.data?.url ?? null,
    expiraEn: envelope.data?.expira_en ?? null,
  }
}

/**
 * `POST /eventos/{id_evento}/comanda` — multipart upload, used for both
 * the first upload and every subsequent replace (the real backend has no
 * separate "replace" endpoint: `docs/decisions.md` ADR-007 — "replace not
 * delete"). `FormData` key is exactly `"comanda"`, matching the backend's
 * `ctx.request.file('comanda', ...)` — no other field is read by the
 * backend, so none is sent. Never sets a `Content-Type` header manually;
 * `requestSgeb`/the shared `sgebClient` (fixed in this same branch) lets
 * the browser generate the multipart boundary.
 */
export async function uploadOrReplaceComanda(
  idEvento: number,
  file: File,
): Promise<ComandaMetadataViewModel> {
  const formData = new FormData()
  formData.append('comanda', file)
  const envelope = await requestSgeb<ComandaApiRecord>({
    url: `/eventos/${String(idEvento)}/comanda`,
    method: 'POST',
    data: formData,
  })
  if (envelope.data === null) {
    // Never observed against the pinned backend — a successful upload
    // always returns the new Comanda record — guarded defensively rather
    // than assumed, same as `fetchEventoDetalle`/`createMermaReport`.
    throw new SgebNetworkError('No pudimos interpretar la respuesta del servidor.')
  }
  return mapComandaMetadata(envelope.data)
}

/**
 * `DELETE /eventos/{id_evento}/comanda` — soft-retire. The real response's
 * `data` is `null` on success (openapi: "Baja lógica realizada. `data` es
 * null"), so there is nothing to map or return.
 */
export async function retireComanda(idEvento: number): Promise<void> {
  await requestSgeb<null>({
    url: `/eventos/${String(idEvento)}/comanda`,
    method: 'DELETE',
  })
}

/**
 * `GET /eventos/{id_evento}/comanda/archivo` — the authenticated binary
 * proxy, used only as the local/dev fallback when the fresh signed `url`
 * from `fetchComandaAccess` is not browser-navigable (`local://...`). Goes
 * through `requestSgebBinary`, so it reuses the same Bearer attachment and
 * SGEB-1002 refresh-and-retry as every other call in this file — never a
 * separate fetch/auth implementation.
 */
export async function fetchComandaFile(
  idEvento: number,
  signal?: AbortSignal,
): Promise<Blob> {
  return requestSgebBinary({
    url: `/eventos/${String(idEvento)}/comanda/archivo`,
    ...(signal ? { signal } : {}),
  })
}
