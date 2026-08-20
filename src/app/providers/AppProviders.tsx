import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import { queryClient } from '@/app/providers/queryClient'

interface AppProvidersProps {
  children: ReactNode
}

/**
 * Root provider composition for the application.
 *
 * Only the TanStack Query provider lives here. There is still no
 * `AuthProvider` — the OIDC session lives in its own Zustand store
 * (`features/oidc-client/session/sessionStore.ts`), read directly rather
 * than through a context provider. `SocketProvider`
 * (feature/panel-realtime-notifications) exists now too, but deliberately
 * does NOT live here: it needs the resolved, authenticated session
 * `AppShellLayout` guarantees, so it wraps `AppShell` there instead — see
 * that file's own comment.
 */
export function AppProviders({ children }: AppProvidersProps) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
