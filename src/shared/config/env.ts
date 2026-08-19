import { z } from 'zod'

/**
 * Validated, typed access to build-time environment variables.
 *
 * Only variables that are actually consumed by the frontend today are
 * declared here. Do not add speculative variables ahead of the feature
 * that needs them.
 */
const envSchema = z.object({
  VITE_SGEB_API_URL: z.url({
    error: 'VITE_SGEB_API_URL must be a valid absolute URL.',
  }),
  VITE_SSO_API_URL: z.url({
    error: 'VITE_SSO_API_URL must be a valid absolute URL.',
  }),
  /**
   * Public (browser-safe) Mapbox access token for the Salón location
   * picker's map + forward geocoding (`shared/components/ui/mapbox-map.tsx`,
   * `shared/api/mapboxGeocodingApi.ts`). Optional at the schema level: an
   * absent token must never crash the whole app on boot — only the Salón
   * form's map degrades to a "map unavailable" state (see
   * `SalonLocationPicker`). Restrict this token to the app's own origins
   * (URL restrictions) in the Mapbox dashboard; never use a secret token
   * here.
   */
  VITE_MAPBOX_ACCESS_TOKEN: z.string().min(1).optional(),
})

function loadEnv() {
  const result = envSchema.safeParse(import.meta.env)

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n')

    throw new Error(
      `Invalid environment configuration. Check your .env file against .env.example:\n${issues}`,
    )
  }

  return result.data
}

export const env = loadEnv()
