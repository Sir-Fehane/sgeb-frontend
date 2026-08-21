import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fetchMiPerfil,
  updateMiPerfil,
  type UsuarioApiRecord,
} from '@/features/account/services/usuariosApi'
import { SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

const RECORD: UsuarioApiRecord = {
  uuid_usuario: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  nombre: 'Ana',
  apellido_paterno: 'Torres',
  apellido_materno: null,
  correo: 'ana.torres@example.com',
  telefono: '+528112345678',
  activo: true,
}

describe('fetchMiPerfil', () => {
  it('requests GET /usuarios/me with the signal, mapped from the wire shape, never sending an identifier', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: RECORD,
    })
    const controller = new AbortController()

    const result = await fetchMiPerfil(controller.signal)

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/usuarios/me',
      signal: controller.signal,
    })
    expect(result).toEqual({
      uuidUsuario: RECORD.uuid_usuario,
      nombre: 'Ana',
      apellidoPaterno: 'Torres',
      apellidoMaterno: null,
      correo: 'ana.torres@example.com',
      telefono: '+528112345678',
      activo: true,
    })
  })

  it('throws a SgebNetworkError if the envelope carries null data on success (defensive guard)', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: null,
    })

    await expect(fetchMiPerfil()).rejects.toBeInstanceOf(SgebNetworkError)
  })
})

describe('updateMiPerfil', () => {
  it('PUTs /usuarios/me with exactly the given partial body', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: { ...RECORD, telefono: '+528187654321' },
    })

    await updateMiPerfil({ telefono: '+528187654321' })

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/usuarios/me',
      method: 'PUT',
      data: { telefono: '+528187654321' },
    })
  })

  it('never sends correo, role, or account-status fields — not part of this endpoint', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: RECORD,
    })

    const request = { nombre: 'Ana María' }
    await updateMiPerfil(request)

    expect(request).not.toHaveProperty('correo')
    expect(request).not.toHaveProperty('activo')
    expect(request).not.toHaveProperty('rol')
  })

  it('throws a SgebNetworkError if the envelope carries null data on success (defensive guard)', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: null,
    })

    await expect(updateMiPerfil({ nombre: 'Ana' })).rejects.toBeInstanceOf(
      SgebNetworkError,
    )
  })
})
