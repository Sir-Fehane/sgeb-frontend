/**
 * Client-side prevalidation for `POST /eventos/{id_evento}/comanda` — UX
 * only, never authoritative. Mirrors the backend's real allow-list
 * (`comanda_service.ts`'s `TIPOS_PERMITIDOS`/`MAX_BYTES`, confirmed
 * against `tests/unit/comanda.spec.ts`), so a captain gets immediate
 * feedback instead of a round trip for an obviously-wrong file — but
 * `File.type` is browser-reported and not trustworthy as a security
 * boundary, and the backend's own `SGEB-2004`/`SGEB-2012` responses
 * remain the real, final validation. Never skip handling those.
 */
export const ACCEPTED_COMANDA_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/webp',
] as const

export const MAX_COMANDA_FILE_SIZE_BYTES = 10 * 1024 * 1024

/** Returns a safe, user-facing Spanish message when the file fails prevalidation, or `null` when it looks acceptable. */
export function validateComandaFile(file: File): string | null {
  if (
    !ACCEPTED_COMANDA_MIME_TYPES.includes(
      file.type as (typeof ACCEPTED_COMANDA_MIME_TYPES)[number],
    )
  ) {
    return 'Formato no permitido. Usa PDF, JPEG, PNG, HEIC o WebP.'
  }
  if (file.size > MAX_COMANDA_FILE_SIZE_BYTES) {
    return 'El archivo supera el máximo de 10 MB.'
  }
  return null
}
