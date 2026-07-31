import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { App } from '@/app/App'

describe('App', () => {
  it('renders the design system preview page at the root route', async () => {
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
