import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fetchMiPerfil,
  fetchMisDatosBancarios,
  isDatosBancariosNoRegistradosError,
  registrarMisDatosBancarios,
  updateMiPerfil,
  type DatosBancariosApiRecord,
  type UsuarioApiRecord,
} from '@/features/account/services/usuariosApi'
import { SgebApplicationError, SgebNetworkError } from '@/shared/api/sgebApiError'
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

const BANK_RECORD: DatosBancariosApiRecord = {
  id_datos: 1,
  clabe: '0123…5678',
  banco: 'BBVA',
  titular_cuenta: 'Ana Torres',
  activo: true,
}

describe('fetchMisDatosBancarios', () => {
  it('requests GET /usuarios/me/datos-bancarios with the signal, mapped from the wire shape', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: BANK_RECORD,
    })
    const controller = new AbortController()

    const result = await fetchMisDatosBancarios(controller.signal)

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/usuarios/me/datos-bancarios',
      signal: controller.signal,
    })
    expect(result).toEqual({
      idDatos: 1,
      clabeEnmascarada: '0123…5678',
      banco: 'BBVA',
      titularCuenta: 'Ana Torres',
      activo: true,
    })
  })

  it('propagates the SGEB-3001 "not registered" application error unchanged, never resolving to null', async () => {
    const error = new SgebApplicationError(404, {
      code: 'SGEB-3001',
      message: 'No encontramos la información solicitada.',
    })
    vi.mocked(requestSgeb).mockRejectedValue(error)

    await expect(fetchMisDatosBancarios()).rejects.toBe(error)
  })
})

describe('isDatosBancariosNoRegistradosError', () => {
  it('is true only for a SgebApplicationError carrying SGEB-3001', () => {
    expect(
      isDatosBancariosNoRegistradosError(
        new SgebApplicationError(404, { code: 'SGEB-3001', message: 'x' }),
      ),
    ).toBe(true)
    expect(
      isDatosBancariosNoRegistradosError(
        new SgebApplicationError(422, { code: 'SGEB-2005', message: 'x' }),
      ),
    ).toBe(false)
    expect(isDatosBancariosNoRegistradosError(new SgebNetworkError('x'))).toBe(false)
  })
})

describe('registrarMisDatosBancarios', () => {
  it('POSTs /usuarios/me/datos-bancarios with exactly the given body', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'creado' },
      data: BANK_RECORD,
    })

    await registrarMisDatosBancarios({
      clabe: '012345678901234567',
      banco: 'BBVA',
      titularCuenta: 'Ana Torres',
    })

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/usuarios/me/datos-bancarios',
      method: 'POST',
      data: {
        clabe: '012345678901234567',
        banco: 'BBVA',
        titularCuenta: 'Ana Torres',
      },
    })
  })

  it('throws a SgebNetworkError if the envelope carries null data on success (defensive guard)', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'creado' },
      data: null,
    })

    await expect(
      registrarMisDatosBancarios({
        clabe: '012345678901234567',
        banco: 'BBVA',
        titularCuenta: 'Ana Torres',
      }),
    ).rejects.toBeInstanceOf(SgebNetworkError)
  })
})
