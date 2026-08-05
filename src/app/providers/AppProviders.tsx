import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import { queryClient } from '@/app/providers/queryClient'

interface AppProvidersProps {
  children: ReactNode
}

/**
 * Root provider composition for the application.
 *
 * Intentionally minimal: only the TanStack Query provider lives here today.
 * Do not add an AuthProvider or SocketProvider — both depend on contracts
 * (token storage, real-time events) that are still pending team decisions,
 * per docs/FrontendArchitecture.md §10.1 and §7.4.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
