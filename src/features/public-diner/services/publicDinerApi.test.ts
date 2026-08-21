import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  crearCalificacion,
  crearSolicitud,
  emitirTokenComensal,
  fetchMesaPublica,
  getOrCreateTokenComensal,
} from '@/features/public-diner/services/publicDinerApi'
import { requestPublic } from '@/shared/api/publicClient'
import type * as PublicClientModule from '@/shared/api/publicClient'

vi.mock('@/shared/api/publicClient', async () => {
  const actual = await vi.importActual<typeof PublicClientModule>(
    '@/shared/api/publicClient',
  )
  return { ...actual, requestPublic: vi.fn() }
})

beforeEach(() => {
  vi.mocked(requestPublic).mockReset()
  window.localStorage.clear()
})

describe('fetchMesaPublica', () => {
  it('maps the real GET /publico/mesas/{codigo_qr} response — no mesero, no token_comensal field exists to map', async () => {
    vi.mocked(requestPublic).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: {
        id_mesa: 12,
        etiqueta: 'Mesa 12',
        evento: { id_evento: 1001, titulo: 'Boda García', estado: 'en_curso' },
      },
    })

    const table = await fetchMesaPublica('qr-abc')

    expect(requestPublic).toHaveBeenCalledWith({
      url: '/publico/mesas/qr-abc',
      method: 'GET',
      signal: undefined,
    })
    expect(table).toEqual({
      idMesa: 12,
      etiqueta: 'Mesa 12',
      evento: { idEvento: 1001, titulo: 'Boda García', estado: 'en_curso' },
    })
  })

  it('URL-encodes the codigo_qr path segment', async () => {
    vi.mocked(requestPublic).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: {
        id_mesa: 1,
        etiqueta: 'x',
        evento: { id_evento: 1, titulo: 'x', estado: 'publicado' },
      },
    })

    await fetchMesaPublica('qr with spaces')

    expect(requestPublic).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/publico/mesas/qr%20with%20spaces' }),
    )
  })
})

describe('crearSolicitud', () => {
  it('sends only { tipo: "atencion" } — no other type is ever sent by this feature', async () => {
    vi.mocked(requestPublic).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: { id_solicitud: 1, tipo: 'atencion', estado: 'pendiente', creada_en: 'x' },
    })

    await crearSolicitud('qr-abc', 'atencion')

    expect(requestPublic).toHaveBeenCalledWith({
      url: '/publico/mesas/qr-abc/solicitudes',
      method: 'POST',
      data: { tipo: 'atencion' },
    })
  })
})

describe('getOrCreateTokenComensal', () => {
  it('requests a new token and persists it when none is stored', async () => {
    vi.mocked(requestPublic).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: { token_comensal: 'bbbbbbbb-2222-4bbb-8bbb-bbbbbbbbbbbb' },
    })

    const token = await getOrCreateTokenComensal('qr-abc')

    expect(token).toBe('bbbbbbbb-2222-4bbb-8bbb-bbbbbbbbbbbb')
    expect(requestPublic).toHaveBeenCalledWith({
      url: '/publico/mesas/qr-abc/token',
      method: 'POST',
    })
    expect(window.localStorage.getItem('sgeb:token:qr-abc')).toBe(
      'bbbbbbbb-2222-4bbb-8bbb-bbbbbbbbbbbb',
    )
  })

  it('reuses a stored token without calling POST /token again', async () => {
    window.localStorage.setItem(
      'sgeb:token:qr-abc',
      'aaaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa',
    )

    const token = await getOrCreateTokenComensal('qr-abc')

    expect(token).toBe('aaaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa')
    expect(requestPublic).not.toHaveBeenCalled()
  })
})

describe('emitirTokenComensal', () => {
  it('always requests a new token, ignoring any stored value (the uncached primitive)', async () => {
    vi.mocked(requestPublic).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: { token_comensal: 'cccccccc-3333-4ccc-8ccc-cccccccccccc' },
    })

    const token = await emitirTokenComensal('qr-abc')

    expect(token).toBe('cccccccc-3333-4ccc-8ccc-cccccccccccc')
  })
})

describe('crearCalificacion', () => {
  it('resolves/reuses the token_comensal first, then sends it with the rating — the caller never supplies it', async () => {
    window.localStorage.setItem(
      'sgeb:token:qr-abc',
      'aaaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa',
    )
    vi.mocked(requestPublic).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: { id_calificacion: 1, puntuacion: 5, creada_en: 'x' },
    })

    await crearCalificacion('qr-abc', { puntuacion: 5, comentario: 'Excelente servicio' })

    expect(requestPublic).toHaveBeenCalledWith({
      url: '/publico/mesas/qr-abc/calificaciones',
      method: 'POST',
      data: {
        tokenComensal: 'aaaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa',
        puntuacion: 5,
        comentario: 'Excelente servicio',
      },
    })
  })

  it('sends comentario as null (never undefined) when omitted', async () => {
    window.localStorage.setItem(
      'sgeb:token:qr-abc',
      'aaaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa',
    )
    vi.mocked(requestPublic).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: { id_calificacion: 1, puntuacion: 4, creada_en: 'x' },
    })

    await crearCalificacion('qr-abc', { puntuacion: 4 })

    expect(requestPublic).toHaveBeenCalledWith({
      url: '/publico/mesas/qr-abc/calificaciones',
      method: 'POST',
      data: {
        tokenComensal: 'aaaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa',
        puntuacion: 4,
        comentario: null,
      },
    })
  })
})
