import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { App } from '@/app/App'
import { router } from '@/app/router/routes'

/**
 * `/` is the public `LandingPage` (`feature/pre-release-polish-and-hardening`)
 * — it reads `useOidcSessionStore` (redirects to `/panel` when
 * authenticated), so asserting on it here would mean exercising real
 * session-store state with none of `routes.test.tsx`'s mocks in place,
 * which is exactly what that file's own dedicated, properly-mocked
 * "/ is the public LandingPage" suite already covers. This smoke test only
 * needs to confirm `App` wires `AppProviders` + `router` together
 * correctly, so it navigates to the one route that stays unguarded and
 * dependency-free: `/dev/design-system`, the design-system preview's home.
 */
describe('App', () => {
  it('renders the design system preview page at /dev/design-system', async () => {
    await router.navigate('/dev/design-system')
    render(<App />)

    expect(
      await screen.findByText(
        /SGEB frontend foundation is running/i,
        {},
        { timeout: 5000 },
      ),
    ).toBeInTheDocument()
    expect(screen.getByText(/Design System — Development Preview/i)).toBeInTheDocument()
  })
})
