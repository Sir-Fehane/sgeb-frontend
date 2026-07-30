import { QueryClient } from '@tanstack/react-query'

/**
 * Single TanStack Query client for the application.
 *
 * Kept at defaults deliberately: a code-aware retry policy (e.g. never
 * retrying deterministic 4xx business errors) belongs with the feature
 * work that actually reads `result.code`, not in this foundation —
 * see docs/FrontendArchitecture.md §16.
 */
export const queryClient = new QueryClient()
