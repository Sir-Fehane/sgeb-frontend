/**
 * Mirrors the exact public diner route registered at
 * `/publico/mesas/:codigoQr` (`app/router/routes.tsx`) — the only route
 * that resolves a mesa's QR (`PublicDinerPage` → `GET
 * /publico/mesas/{codigo_qr}`). Any change to that route must be mirrored
 * here.
 */
const PUBLIC_MESA_ROUTE_PREFIX = '/publico/mesas/'

/**
 * Builds the exact URL a mesa's QR must encode. `window.location.origin`
 * rather than a hardcoded domain: this repo has no `VITE_APP_URL`-style
 * frontend-origin env var (confirmed absent from `.env`/`.env.example`),
 * and the origin actually serving this page is already the correct one
 * for whichever environment (local/dev/staging/production) is running —
 * hardcoding `mediocres-inc.online` would silently break every non-prod
 * deployment's QR codes.
 */
export function buildMesaPublicaUrl(codigoQr: string): string {
  return `${window.location.origin}${PUBLIC_MESA_ROUTE_PREFIX}${encodeURIComponent(codigoQr)}`
}
