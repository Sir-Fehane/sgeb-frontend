/**
 * SGEB `result.code` values this transport boundary treats specially
 * (`docs/errors/Diccionario_Errores_SGEB.md`, serie 1xxx — "Validación del
 * token en la aplicación"). Not a registry of every SGEB code: business
 * codes belong to the feature that owns them (docs/decisions.md ADR-005).
 */
export const SGEB_CODE = {
  /** Access token expired — attempt exactly one OIDC refresh, then retry once. */
  TOKEN_EXPIRED: 'SGEB-1002',
  /** Token malformed/manipulated/invalid signature — never auto-refreshed. */
  TOKEN_INVALID: 'SGEB-1003',
  /** Role/claim does not authorize the endpoint — never auto-refreshed. */
  FORBIDDEN: 'SGEB-1004',
} as const
