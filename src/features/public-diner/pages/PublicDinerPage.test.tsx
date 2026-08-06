import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { PUBLIC_DINER_TABLE_FIXTURE } from '@/features/public-diner/fixtures/publicDinerFixtures'
import { PublicDinerPage } from '@/features/public-diner/pages/PublicDinerPage'

function renderAt(codigoQr: string) {
  return render(
    <MemoryRouter initialEntries={[`/publico/mesas/${codigoQr}`]}>
      <Routes>
        <Route path="/publico/mesas/:codigoQr" element={<PublicDinerPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PublicDinerPage', () => {
  it('renders the public diner page with the fixture table context', () => {
    renderAt('a1b2c3d4-e5f6-4a1b-8c2d-000000000099')

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: PUBLIC_DINER_TABLE_FIXTURE.etiqueta,
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(`Te atiende: ${PUBLIC_DINER_TABLE_FIXTURE.mesero}`),
    ).toBeInTheDocument()
  })

  it('renders no AppShell chrome (no sidebar navigation, no authenticated banner)', () => {
    renderAt('a1b2c3d4-e5f6-4a1b-8c2d-000000000099')

    expect(
      screen.queryByRole('navigation', { name: 'Navegación principal' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
  })

  it('renders no AuthLayout content (no login/password form)', () => {
    renderAt('a1b2c3d4-e5f6-4a1b-8c2d-000000000099')

    expect(screen.queryByLabelText(/contraseña/i)).not.toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Iniciar sesión' }),
    ).not.toBeInTheDocument()
  })

  it('shows a development-data notice', () => {
    renderAt('a1b2c3d4-e5f6-4a1b-8c2d-000000000099')

    expect(screen.getAllByText(/datos de desarrollo/i).length).toBeGreaterThan(0)
  })

  it('never renders the codigoQr route value', () => {
    const codigoQr = 'a1b2c3d4-e5f6-4a1b-8c2d-000000000099'
    renderAt(codigoQr)

    expect(screen.queryByText(codigoQr)).not.toBeInTheDocument()
  })

  it('shows an honest demo disclosure after requesting attention, never claiming a real request was sent', async () => {
    const user = userEvent.setup()
    renderAt('a1b2c3d4-e5f6-4a1b-8c2d-000000000099')

    await user.click(screen.getByRole('button', { name: 'Llamar al mesero' }))

    expect(
      screen.getByText(
        'Demostración: la solicitud se validó localmente; aún no se envió al personal.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText('Avisamos a tu mesero.')).not.toBeInTheDocument()
  })

  it('shows an honest demo disclosure after submitting a rating, never claiming it was persisted', async () => {
    const user = userEvent.setup()
    renderAt('a1b2c3d4-e5f6-4a1b-8c2d-000000000099')

    await user.click(screen.getByRole('radio', { name: '5 de 5 — Excelente' }))
    await user.click(screen.getByRole('button', { name: 'Enviar calificación' }))

    expect(
      await screen.findByText(/Demostración: tu calificación se validó localmente/),
    ).toBeInTheDocument()
  })
})
