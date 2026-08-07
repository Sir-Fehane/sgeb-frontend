import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { EventDetailPage } from '@/features/events/pages/EventDetailPage'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/eventos/:id" element={<EventDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('EventDetailPage', () => {
  it('renders the populated fixture for a known event id, clearly labeled as development data', () => {
    renderAt('/eventos/1001')

    expect(
      screen.getByRole('heading', { level: 2, name: 'Evento de demostración — boda' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/datos de desarrollo/)).toBeInTheDocument()
  })

  it('renders the second required demo variant — empresarial, en_curso, no comanda', () => {
    renderAt('/eventos/2001')

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Evento de demostración — conferencia en curso',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Empresarial')).toBeInTheDocument()
    expect(screen.getByText('En curso')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Abrir comanda/ })).not.toBeInTheDocument()
  })

  it('renders the unavailable state for a malformed route id', () => {
    renderAt('/eventos/not-a-number')

    expect(screen.getByText('No encontramos el evento solicitado.')).toBeInTheDocument()
  })

  it('renders the unavailable state for a well-formed id with no matching fixture', () => {
    renderAt('/eventos/424242')

    expect(screen.getByText('No encontramos el evento solicitado.')).toBeInTheDocument()
  })

  it('renders the unavailable state for zero, negative, and decimal ids', () => {
    for (const badId of ['0', '-5', '10.5']) {
      const { unmount } = renderAt(`/eventos/${badId}`)
      expect(screen.getByText('No encontramos el evento solicitado.')).toBeInTheDocument()
      unmount()
    }
  })
})
