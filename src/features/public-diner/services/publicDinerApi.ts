import {
  readStoredTokenComensal,
  writeStoredTokenComensal,
} from '@/features/public-diner/services/tokenComensalStorage'
import type {
  PublicDinerEventoEstado,
  PublicDinerTableViewModel,
  ServiceRequestType,
} from '@/features/public-diner/types/publicDiner'
import { requestPublic } from '@/shared/api/publicClient'
import { SgebNetworkError } from '@/shared/api/sgebApiError'

/**
 * `result.code` values this feature reacts to, confirmed against the
 * pinned backend's actual error catalogue
 * (`app/shared/errors/catalogo.ts`) and `ComensalService`/`EventoService`
 * — not invented, and not the full catalogue (docs/decisions.md ADR-005:
 * business codes belong to the feature that owns them).
 */
export const PUBLIC_DINER_CODE = {
  /** QR doesn't resolve to any mesa — unknown code, regenerated/invalidated code, or the event isn't `publicado`/`en_curso` (deliberately the same code, so a stale view can't be used to probe event state). */
  MESA_NO_ENCONTRADA: 'SGEB-3003',
  /** A `pendiente` solicitud already exists for this table — the anti-spam rule, not a fixed cooldown timer. */
  SOLICITUD_EN_CURSO: 'SGEB-4014',
  /** This `token_comensal` already has a calificación on record (DB `UNIQUE` constraint). */
  CALIFICACION_DUPLICADA: 'SGEB-4010',
  /** No mesero is linked to this table yet (`AsignacionMesa.vinculada`) — nothing to rate. */
  SIN_MESERO_VINCULADO: 'SGEB-3002',
} as const

interface MesaPublicaApiRecord {
  id_mesa: number
  etiqueta: string
  evento: {
    id_evento: number
    titulo: string
    estado: PublicDinerEventoEstado
  }
}

/** `GET /publico/mesas/{codigo_qr}` — no auth, resolves the table printed on the QR. */
export async function fetchMesaPublica(
  codigoQr: string,
  signal?: AbortSignal,
): Promise<PublicDinerTableViewModel> {
  const envelope = await requestPublic<MesaPublicaApiRecord>({
    url: `/publico/mesas/${encodeURIComponent(codigoQr)}`,
    method: 'GET',
    ...(signal ? { signal } : {}),
  })
  if (envelope.data === null) {
    throw new SgebNetworkError('No pudimos interpretar la respuesta del servidor.')
  }
  const { id_mesa, etiqueta, evento } = envelope.data
  return {
    idMesa: id_mesa,
    etiqueta,
    evento: {
      idEvento: evento.id_evento,
      titulo: evento.titulo,
      estado: evento.estado,
    },
  }
}

interface SolicitudApiRecord {
  id_solicitud: number
  tipo: string
  estado: string
  creada_en: string
}

/** `POST /publico/mesas/{codigo_qr}/solicitudes` — "Llamar al mesero." Resolves to `void`: the page has no readback endpoint to reconcile the created row against (confirmed absent from the pinned backend), so nothing here is mapped into a view model that could imply one exists. */
export async function crearSolicitud(
  codigoQr: string,
  tipo: ServiceRequestType,
): Promise<void> {
  const envelope = await requestPublic<SolicitudApiRecord>({
    url: `/publico/mesas/${encodeURIComponent(codigoQr)}/solicitudes`,
    method: 'POST',
    data: { tipo },
  })
  if (envelope.data === null) {
    throw new SgebNetworkError('No pudimos interpretar la respuesta del servidor.')
  }
}

interface TokenComensalApiRecord {
  token_comensal: string
}

/**
 * `POST /publico/mesas/{codigo_qr}/token` alone, uncached. Prefer
 * `getOrCreateTokenComensal` below for real use — this is exported
 * separately only so it can be tested/reused in isolation.
 */
export async function emitirTokenComensal(codigoQr: string): Promise<string> {
  const envelope = await requestPublic<TokenComensalApiRecord>({
    url: `/publico/mesas/${encodeURIComponent(codigoQr)}/token`,
    method: 'POST',
  })
  if (envelope.data === null) {
    throw new SgebNetworkError('No pudimos interpretar la respuesta del servidor.')
  }
  return envelope.data.token_comensal
}

/**
 * Reuses a previously-issued `token_comensal` for this exact QR from
 * `localStorage` when one exists; otherwise requests a new one and
 * persists it. Called lazily, only right before a rating is actually
 * submitted — never on page load — per the backend owner's explicit
 * guidance (`docs/api/RESPUESTAS-frontend-FINAL.md`): a `GET` must stay
 * cacheable, and issuing a token to every visitor who never rates would
 * waste one for nothing.
 */
export async function getOrCreateTokenComensal(codigoQr: string): Promise<string> {
  const stored = readStoredTokenComensal(codigoQr)
  if (stored) {
    return stored
  }
  const issued = await emitirTokenComensal(codigoQr)
  writeStoredTokenComensal(codigoQr, issued)
  return issued
}

export interface CrearCalificacionInput {
  puntuacion: number
  comentario?: string | undefined
}

interface CalificacionApiRecord {
  id_calificacion: number
  puntuacion: number
  creada_en: string
}

/**
 * `POST /publico/mesas/{codigo_qr}/calificaciones`. Fetches/reuses
 * `token_comensal` via `getOrCreateTokenComensal` first — the caller never
 * supplies or sees the token (see `PublicDinerRatingValues`'s doc
 * comment). Resolves to `void`: the token is deliberately never echoed
 * back by the server (see `ComensalController#calificar`), and there is
 * nothing else worth mapping out of the response for this UI.
 */
export async function crearCalificacion(
  codigoQr: string,
  input: CrearCalificacionInput,
): Promise<void> {
  const tokenComensal = await getOrCreateTokenComensal(codigoQr)
  const envelope = await requestPublic<CalificacionApiRecord>({
    url: `/publico/mesas/${encodeURIComponent(codigoQr)}/calificaciones`,
    method: 'POST',
    data: {
      tokenComensal,
      puntuacion: input.puntuacion,
      comentario: input.comentario ?? null,
    },
  })
  if (envelope.data === null) {
    throw new SgebNetworkError('No pudimos interpretar la respuesta del servidor.')
  }
}
