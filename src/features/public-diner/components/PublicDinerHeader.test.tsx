import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PublicDinerHeader } from '@/features/public-diner/components/PublicDinerHeader'

describe('PublicDinerHeader', () => {
  it('renders etiqueta as the one clear h1', () => {
    render(<PublicDinerHeader etiqueta="Mesa 12" eventoTitulo="Boda García" />)

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Mesa 12' })).toBeInTheDocument()
  })

  it('renders the event title', () => {
    render(<PublicDinerHeader etiqueta="Mesa 12" eventoTitulo="Boda García" />)

    expect(screen.getByText('Boda García')).toBeInTheDocument()
  })

  it('renders no mesero/waiter name — the real GET /publico/mesas/{codigo_qr} response never includes one', () => {
    render(<PublicDinerHeader etiqueta="Mesa 12" eventoTitulo="Boda García" />)

    expect(screen.queryByText(/te atiende/i)).not.toBeInTheDocument()
  })

  it('invents no venue or captain data', () => {
    render(<PublicDinerHeader etiqueta="Mesa 12" eventoTitulo="Boda García" />)

    expect(screen.queryByText(/salón|capitán/i)).not.toBeInTheDocument()
  })
})
