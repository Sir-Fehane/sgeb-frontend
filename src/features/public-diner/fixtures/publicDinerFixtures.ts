import type { PublicDinerTableViewModel } from '@/features/public-diner/types/publicDiner'

/**
 * Development/demo fixture only — NOT live backend data. Fictional
 * table label, waiter first-name-plus-initial, and an opaque UUID-shaped
 * token (never rendered). Remove once real API integration (a later
 * branch) supplies `GET /publico/mesas/{codigo_qr}` responses.
 */
export const PUBLIC_DINER_TABLE_FIXTURE: PublicDinerTableViewModel = {
  etiqueta: 'Mesa 12',
  mesero: 'Luis R.',
  tokenComensal: 'd4e5f6a7-b8c9-4d1e-9f2a-000000000001',
}
