import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PublicDinerHeader } from '@/features/public-diner/components/PublicDinerHeader'

describe('PublicDinerHeader', () => {
  it('renders etiqueta as the one clear h1', () => {
    render(<PublicDinerHeader etiqueta="Mesa 12" mesero="Luis R." />)

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Mesa 12' })).toBeInTheDocument()
  })

  it('renders the assigned waiter name', () => {
    render(<PublicDinerHeader etiqueta="Mesa 12" mesero="Luis R." />)

    expect(screen.getByText('Te atiende: Luis R.')).toBeInTheDocument()
  })

  it('invents no event, venue, or captain data', () => {
    render(<PublicDinerHeader etiqueta="Mesa 12" mesero="Luis R." />)

    expect(screen.queryByText(/evento|salón|capitán/i)).not.toBeInTheDocument()
  })
})
