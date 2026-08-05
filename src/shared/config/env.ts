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
