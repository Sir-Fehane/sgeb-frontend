import { z } from 'zod'

/**
 * Typed, validated OIDC client configuration, sourced from environment
 * variables — mirrors the validation style of `src/shared/config/env.ts`
 * (Zod, `VITE_`-prefixed, one safe-parse call with a readable error).
 *
 * Deliberately NOT merged into the shared `env.ts` schema: that module
 * validates eagerly at import time (`export const env = loadEnv()`), which
 * would make every test that transitively imports it fail without a real
 * `.env` file — and today nothing does, so nothing currently pays that
 * cost. This feature is also the only consumer of these variables (not
 * genuinely cross-feature yet), so it owns its own lazily-evaluated loader
 * instead: `getOidcConfig()` only parses `import.meta.env` when actually
 * called, never merely on import — required by this branch's explicit
 * "no hard crash during module import" constraint.
 *
 * This is a public PKCE client: no client secret field exists here, and
 * none should ever be added — PKCE is what authenticates the client
 * (`docs/sso/openapi-sso.yaml`'s own "Clientes públicos, sin secreto" note).
 */
export interface OidcConfig {
  /** The provider's issuer URL, e.g. https://auth.sgeb.mediocres.mx */
  issuer: string
  /** Always `sgeb-web-panel` in practice — kept as configuration, not a hard-coded literal. */
  clientId: string
  /** Must exactly match a URL registered for this client (byte-for-byte, per the provider). */
  redirectUri: string
  postLogoutRedirectUri: string
  /**
   * Space-separated scope string. `openapi-sso.yaml`'s `scope` parameter
   * documents `openid perfil sgeb.api` only as an `example`, not a
   * confirmed, registered client value — so this stays environment
   * configuration rather than a hard-coded constant, and this branch never
   * silently invents or assumes additional scopes.
   */
  scope: string
}

const oidcConfigSchema = z.object({
  VITE_OIDC_ISSUER: z.url({
    error: 'VITE_OIDC_ISSUER must be a valid absolute URL.',
  }),
  VITE_OIDC_CLIENT_ID: z.string().min(1, 'VITE_OIDC_CLIENT_ID must not be empty.'),
  VITE_OIDC_REDIRECT_URI: z.url({
    error: 'VITE_OIDC_REDIRECT_URI must be a valid absolute URL.',
  }),
  VITE_OIDC_POST_LOGOUT_REDIRECT_URI: z.url({
    error: 'VITE_OIDC_POST_LOGOUT_REDIRECT_URI must be a valid absolute URL.',
  }),
  VITE_OIDC_SCOPE: z
    .string()
    .min(1, 'VITE_OIDC_SCOPE must not be empty.')
    .refine((scope) => scope.split(' ').includes('openid'), {
      error: 'VITE_OIDC_SCOPE must include the "openid" scope.',
    }),
})

/** Thrown by `getOidcConfig()` — never thrown merely by importing this module. */
export class OidcConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OidcConfigError'
  }
}

/** Safe, user-facing message for any configuration failure — never the raw Zod issue list. */
export const OIDC_CONFIG_SAFE_MESSAGE =
  'No pudimos iniciar el proceso de autenticación. Intenta de nuevo más tarde.'

/**
 * Validates and returns the OIDC client configuration. Called explicitly by
 * the authorization-request and callback flows — never executed as a
 * side effect of importing this module, so unrelated tests (and any test
 * environment without these variables set) are never affected.
 */
export function getOidcConfig(
  source: Record<string, unknown> = import.meta.env,
): OidcConfig {
  const result = oidcConfigSchema.safeParse(source)

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')

    throw new OidcConfigError(
      `Invalid OIDC configuration. Check your .env file against .env.example:\n${issues}`,
    )
  }

  return {
    issuer: result.data.VITE_OIDC_ISSUER,
    clientId: result.data.VITE_OIDC_CLIENT_ID,
    redirectUri: result.data.VITE_OIDC_REDIRECT_URI,
    postLogoutRedirectUri: result.data.VITE_OIDC_POST_LOGOUT_REDIRECT_URI,
    scope: result.data.VITE_OIDC_SCOPE,
  }
}
