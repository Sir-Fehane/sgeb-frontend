import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PublicDinerPage } from '@/features/public-diner/pages/PublicDinerPage'
import type { PublicRequestConfig } from '@/shared/api/publicClient'
import { requestPublic } from '@/shared/api/publicClient'
import type * as PublicClientModule from '@/shared/api/publicClient'
import { SgebApplicationError } from '@/shared/api/sgebApiError'
import type { ApiEnvelope } from '@/shared/types/api'

vi.mock('@/shared/api/publicClient', async () => {
  const actual = await vi.importActual<typeof PublicClientModule>(
    '@/shared/api/publicClient',
  )
  return { ...actual, requestPublic: vi.fn() }
})

const CODIGO_QR = 'a1b2c3d4-e5f6-4a1b-8c2d-000000000099'

function successEnvelope<T>(data: T): ApiEnvelope<T> {
  return { result: { code: 'SGEB-0000', message: 'ok' }, data }
}

interface FakeTransportOptions {
  mesaError?: SgebApplicationError
  solicitudError?: SgebApplicationError
  tokenComensal?: string
  calificacionError?: SgebApplicationError
}

/** Mirrors `EventClosurePage.test.tsx`'s `fakeTransport` — a small stateful fake of the public transport, scoped to one `codigo_qr`. */
function fakeTransport(codigoQr: string, options: FakeTransportOptions = {}) {
  const mesaUrl = `/publico/mesas/${codigoQr}`
  const solicitudesUrl = `/publico/mesas/${codigoQr}/solicitudes`
  const tokenUrl = `/publico/mesas/${codigoQr}/token`
  const calificacionesUrl = `/publico/mesas/${codigoQr}/calificaciones`

  const mesaError = options.mesaError
  const solicitudError = options.solicitudError
  const calificacionError = options.calificacionError

  vi.mocked(requestPublic).mockImplementation((config: PublicRequestConfig) => {
    if (config.method === 'GET' && config.url === mesaUrl) {
      if (mesaError) return Promise.reject(mesaError)
      return Promise.resolve(
        successEnvelope({
          id_mesa: 12,
          etiqueta: 'Mesa 12',
          evento: { id_evento: 1001, titulo: 'Boda García', estado: 'en_curso' },
        }),
      )
    }
    if (config.method === 'POST' && config.url === solicitudesUrl) {
      if (solicitudError) return Promise.reject(solicitudError)
      return Promise.resolve(
        successEnvelope({
          id_solicitud: 55,
          tipo: 'atencion',
          estado: 'pendiente',
          creada_en: '2026-08-20T20:00:00Z',
        }),
      )
    }
    if (config.method === 'POST' && config.url === tokenUrl) {
      return Promise.resolve(
        successEnvelope({
          token_comensal: options.tokenComensal ?? 'bbbbbbbb-2222-4bbb-8bbb-bbbbbbbbbbbb',
        }),
      )
    }
    if (config.method === 'POST' && config.url === calificacionesUrl) {
      if (calificacionError) return Promise.reject(calificacionError)
      return Promise.resolve(
        successEnvelope({
          id_calificacion: 9,
          puntuacion: 5,
          creada_en: '2026-08-20T20:05:00Z',
        }),
      )
    }
    throw new Error(`Unexpected requestPublic call in test: ${JSON.stringify(config)}`)
  })
}

function renderAt(codigoQr: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, retryDelay: 0 } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/publico/mesas/${codigoQr}`]}>
        <Routes>
          <Route path="/publico/mesas/:codigoQr" element={<PublicDinerPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.mocked(requestPublic).mockReset()
  window.localStorage.clear()
})

describe('PublicDinerPage', () => {
  it('renders the real mesa/evento context from the transport, not development fixtures', async () => {
    fakeTransport(CODIGO_QR)
    renderAt(CODIGO_QR)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Mesa 12' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Boda García')).toBeInTheDocument()
    expect(screen.queryByText(/datos de desarrollo/i)).not.toBeInTheDocument()
  })

  it('renders no AppShell chrome (no sidebar navigation, no authenticated banner)', async () => {
    fakeTransport(CODIGO_QR)
    renderAt(CODIGO_QR)

    await screen.findByRole('heading', { level: 1, name: 'Mesa 12' })
    expect(
      screen.queryByRole('navigation', { name: 'Navegación principal' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
  })

  it('never renders the codigoQr route value', async () => {
    fakeTransport(CODIGO_QR)
    renderAt(CODIGO_QR)

    await screen.findByRole('heading', { level: 1, name: 'Mesa 12' })
    expect(screen.queryByText(CODIGO_QR)).not.toBeInTheDocument()
  })

  it('renders the unavailable-mesa state on SGEB-3003 (unknown/expired QR)', async () => {
    fakeTransport(CODIGO_QR, {
      mesaError: new SgebApplicationError(404, {
        code: 'SGEB-3003',
        message: 'El código QR escaneado no corresponde a ninguna mesa activa.',
      }),
    })
    renderAt(CODIGO_QR)

    expect(await screen.findByText('No encontramos esta mesa')).toBeInTheDocument()
  })

  it('sends a real POST /solicitudes and shows the real success copy, never demo copy', async () => {
    const user = userEvent.setup()
    fakeTransport(CODIGO_QR)
    renderAt(CODIGO_QR)

    await user.click(await screen.findByRole('button', { name: 'Llamar al mesero' }))

    expect(
      await screen.findByText('Hemos avisado a tu mesero. En un momento te atenderá.'),
    ).toBeInTheDocument()
    expect(vi.mocked(requestPublic)).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `/publico/mesas/${CODIGO_QR}/solicitudes`,
        method: 'POST',
        data: { tipo: 'atencion' },
      }),
    )
  })

  it('maps SGEB-4014 to the throttled state, not a generic error', async () => {
    const user = userEvent.setup()
    fakeTransport(CODIGO_QR, {
      // The pinned backend's own generic SGEB-4014 catalogue copy — kept
      // deliberately different from the UI's own throttled copy below, to
      // prove the UI renders its own approved text rather than echoing
      // whatever the server happens to send.
      solicitudError: new SgebApplicationError(429, {
        code: 'SGEB-4014',
        message: 'Ya avisamos a tu mesero. Dale unos momentos para atenderte.',
      }),
    })
    renderAt(CODIGO_QR)

    await user.click(await screen.findByRole('button', { name: 'Llamar al mesero' }))

    expect(
      await screen.findByText(
        'Tu mesero ya fue avisado. Dale un momento para atenderte.',
      ),
    ).toBeInTheDocument()
  })

  it('never exposes the raw HTTP "Too Many Requests" reason phrase on a 429, even if the server sent it as the message', async () => {
    const user = userEvent.setup()
    fakeTransport(CODIGO_QR, {
      solicitudError: new SgebApplicationError(429, {
        code: 'SGEB-4014',
        message: 'Too Many Requests',
      }),
    })
    renderAt(CODIGO_QR)

    await user.click(await screen.findByRole('button', { name: 'Llamar al mesero' }))

    expect(
      await screen.findByText(
        'Tu mesero ya fue avisado. Dale un momento para atenderte.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/too many requests/i)).not.toBeInTheDocument()
  })

  it('submits a rating by first issuing a token_comensal, then the calificacion', async () => {
    const user = userEvent.setup()
    fakeTransport(CODIGO_QR, { tokenComensal: 'bbbbbbbb-2222-4bbb-8bbb-bbbbbbbbbbbb' })
    renderAt(CODIGO_QR)

    await user.click(await screen.findByRole('radio', { name: '5 de 5 — Excelente' }))
    await user.click(screen.getByRole('button', { name: 'Enviar calificación' }))

    expect(await screen.findByText('¡Gracias por tu calificación!')).toBeInTheDocument()
    expect(vi.mocked(requestPublic)).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `/publico/mesas/${CODIGO_QR}/token`,
        method: 'POST',
      }),
    )
    expect(vi.mocked(requestPublic)).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `/publico/mesas/${CODIGO_QR}/calificaciones`,
        method: 'POST',
        data: {
          tokenComensal: 'bbbbbbbb-2222-4bbb-8bbb-bbbbbbbbbbbb',
          puntuacion: 5,
          comentario: null,
        },
      }),
    )
  })

  it('persists a local rating-submitted marker only after the backend confirms success', async () => {
    const user = userEvent.setup()
    fakeTransport(CODIGO_QR, { tokenComensal: 'bbbbbbbb-2222-4bbb-8bbb-bbbbbbbbbbbb' })
    renderAt(CODIGO_QR)

    expect(
      window.localStorage.getItem(`sgeb:calificacion-enviada:${CODIGO_QR}`),
    ).toBeNull()

    await user.click(await screen.findByRole('radio', { name: '5 de 5 — Excelente' }))
    await user.click(screen.getByRole('button', { name: 'Enviar calificación' }))

    await screen.findByText('¡Gracias por tu calificación!')
    expect(window.localStorage.getItem(`sgeb:calificacion-enviada:${CODIGO_QR}`)).toBe(
      '1',
    )
  })

  it('does not show the rating form again on reload once a rating-submitted marker is stored, showing a thank-you state instead', async () => {
    window.localStorage.setItem(`sgeb:calificacion-enviada:${CODIGO_QR}`, '1')
    fakeTransport(CODIGO_QR)
    renderAt(CODIGO_QR)

    expect(
      await screen.findByText('Ya registraste tu calificación para esta mesa. ¡Gracias!'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Enviar calificación' }),
    ).not.toBeInTheDocument()
    expect(vi.mocked(requestPublic)).not.toHaveBeenCalledWith(
      expect.objectContaining({ url: `/publico/mesas/${CODIGO_QR}/token` }),
    )
  })

  it('still shows the rating form when only a token_comensal is stored, never inferring success from the token alone', async () => {
    window.localStorage.setItem(
      `sgeb:token:${CODIGO_QR}`,
      'aaaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa',
    )
    fakeTransport(CODIGO_QR)
    renderAt(CODIGO_QR)

    expect(
      await screen.findByRole('radio', { name: '5 de 5 — Excelente' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Enviar calificación' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Ya registraste tu calificación para esta mesa. ¡Gracias!'),
    ).not.toBeInTheDocument()
  })

  it('reuses a token_comensal already stored for this exact QR instead of requesting a new one', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem(
      `sgeb:token:${CODIGO_QR}`,
      'aaaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa',
    )
    fakeTransport(CODIGO_QR)
    renderAt(CODIGO_QR)

    await user.click(await screen.findByRole('radio', { name: '5 de 5 — Excelente' }))
    await user.click(screen.getByRole('button', { name: 'Enviar calificación' }))

    await screen.findByText('¡Gracias por tu calificación!')
    expect(vi.mocked(requestPublic)).not.toHaveBeenCalledWith(
      expect.objectContaining({ url: `/publico/mesas/${CODIGO_QR}/token` }),
    )
    expect(vi.mocked(requestPublic)).toHaveBeenCalledWith({
      url: `/publico/mesas/${CODIGO_QR}/calificaciones`,
      method: 'POST',
      data: {
        tokenComensal: 'aaaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa',
        puntuacion: 5,
        comentario: null,
      },
    })
  })

  it('maps SGEB-4010 (duplicate rating) to the already-submitted state and persists the rating-submitted marker', async () => {
    const user = userEvent.setup()
    fakeTransport(CODIGO_QR, {
      calificacionError: new SgebApplicationError(409, {
        code: 'SGEB-4010',
        message: 'Ya registraste tu calificación para esta mesa. ¡Gracias!',
      }),
    })
    renderAt(CODIGO_QR)

    await user.click(await screen.findByRole('radio', { name: '5 de 5 — Excelente' }))
    await user.click(screen.getByRole('button', { name: 'Enviar calificación' }))

    expect(
      await screen.findByText('Ya registraste tu calificación para esta mesa. ¡Gracias!'),
    ).toBeInTheDocument()
    expect(window.localStorage.getItem(`sgeb:calificacion-enviada:${CODIGO_QR}`)).toBe(
      '1',
    )
  })

  it('maps SGEB-3002 (no mesero linked to this mesa) to a specific, honest diner-facing message', async () => {
    const user = userEvent.setup()
    fakeTransport(CODIGO_QR, {
      calificacionError: new SgebApplicationError(422, {
        code: 'SGEB-3002',
        message:
          'Uno de los datos relacionados ya no existe. Actualiza la pantalla e inténtalo de nuevo.',
      }),
    })
    renderAt(CODIGO_QR)

    await user.click(await screen.findByRole('radio', { name: '5 de 5 — Excelente' }))
    await user.click(screen.getByRole('button', { name: 'Enviar calificación' }))

    expect(
      await screen.findByText(
        'No pudimos registrar tu calificación porque esta mesa todavía no tiene un mesero vinculado.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(
        'Uno de los datos relacionados ya no existe. Actualiza la pantalla e inténtalo de nuevo.',
      ),
    ).not.toBeInTheDocument()
  })
})
