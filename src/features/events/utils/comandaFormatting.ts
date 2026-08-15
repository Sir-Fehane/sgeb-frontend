/**
 * Isolated, display-only formatting for the live Comanda section — each
 * feature/section owns its own tiny formatter rather than sharing one
 * across features, the same precedent `closure/utils/closureFormatting.ts`
 * and `payments/utils/paymentsFormatting.ts` already established.
 */

/** `Comanda.tipo_mime` — the exact backend allow-list, never an invented label for an unrecognized value. */
const COMANDA_MIME_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/heic': 'HEIC',
  'image/webp': 'WebP',
}

export function formatComandaMimeType(tipoMime: string): string {
  return COMANDA_MIME_LABELS[tipoMime] ?? tipoMime
}

/** `Comanda.tamano_bytes` — display only. KB below 1 MB, otherwise MB with two decimals. */
export function formatComandaFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${String(Math.round(bytes / 1024))} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
