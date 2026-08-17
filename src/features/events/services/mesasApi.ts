import { SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'

/**
 * Wire shape of one `Mesa` row, confirmed field-for-field against the
 * pinned backend's `app/modules/eventos/models/mesa.ts`. Deliberately no
 * `numero`/`capacidad` fields — the pinned backend's `mesa` table has
 * none; `EVENTO.num_mesas` (a plain planned-count field on the event
 * itself) is unrelated to how many real `Mesa` rows exist, which is what
 * this feature's minimal Mesa management actually creates/lists.
 */
export interface MesaApiRecord {
  id_mesa: number
  id_evento: number
  etiqueta: string
  codigo_qr: string
  nfc_uid: string | null
  estado: 'libre' | 'ocupada'
}

export interface MesaViewModel {
  idMesa: number
  etiqueta: string
  estado: 'libre' | 'ocupada'
  /** The QR's UUID payload — a real, server-generated identifier. Never rendered as a scannable code or link in this branch; see `EventDetailMesasSection`'s own comment for why. */
  codigoQr: string
}

function mapMesaToViewModel(record: MesaApiRecord): MesaViewModel {
  return {
    idMesa: record.id_mesa,
    etiqueta: record.etiqueta,
    estado: record.estado,
    codigoQr: record.codigo_qr,
  }
}

/**
 * Fetches an event's real mesas through the shared authenticated SGEB
 * transport. `GET /eventos/{id}/mesas` sits in the pinned backend's "any
 * authenticated role" route group (not `capitan`/`admin`-only) — every
 * role that can reach Event Detail can see this list, same as Comanda's
 * "Abrir comanda".
 */
export async function fetchMesas(
  idEvento: number,
  signal?: AbortSignal,
): Promise<MesaViewModel[]> {
  const envelope = await requestSgeb<MesaApiRecord[]>({
    url: `/eventos/${String(idEvento)}/mesas`,
    ...(signal ? { signal } : {}),
  })
  return (envelope.data ?? []).map(mapMesaToViewModel)
}

/**
 * `POST /eventos/{id}/mesas` request body — exact field set confirmed
 * against the pinned backend's `mesaValidator`
 * (`app/modules/eventos/validators/evento_validator.ts`). `codigoQr` is
 * never a request field — the server always generates it
 * (`randomUUID()`); this branch has no QR-regeneration UI (out of scope,
 * see this branch's report — minimal Mesa management is list + create
 * only, the exact prerequisite for `borrador → publicado`, not the full
 * Mesa-management surface).
 */
export interface CreateMesaRequest {
  etiqueta: string
  nfcUid?: string | null
}

export async function createMesa(
  idEvento: number,
  request: CreateMesaRequest,
): Promise<MesaViewModel> {
  const envelope = await requestSgeb<MesaApiRecord>({
    url: `/eventos/${String(idEvento)}/mesas`,
    method: 'POST',
    data: request,
  })
  if (envelope.data === null) {
    // Never observed against the pinned backend — a successful creation
    // always returns the created Mesa — guarded defensively rather than
    // assumed, same as `eventsApi.ts`'s `createEvento`.
    throw new SgebNetworkError('No pudimos interpretar la respuesta del servidor.')
  }
  return mapMesaToViewModel(envelope.data)
}
