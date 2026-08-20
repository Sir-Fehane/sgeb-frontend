import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fetchWaiters,
  type UsuarioApiRecord,
} from '@/features/waiters/services/waitersApi'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

const RECORD: UsuarioApiRecord = {
  uuid_usuario: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  nombre: 'Juana',
  apellido_paterno: 'Pérez',
  apellido_materno: 'López',
  correo: 'juana.perez@example.com',
  telefono: '+52 871 000 0001',
  activo: true,
}

function envelope(data: UsuarioApiRecord[]) {
  return { result: { code: 'SGEB-0000', message: 'ok' }, data }
}

describe('fetchWaiters', () => {
  it('always sends rol=mesero, merged with the caller params', async () => {
    vi.mocked(requestSgeb).mockResolvedValue(envelope([RECORD]))

    await fetchWaiters({ activo: true, q: 'Juana' })

    expect(requestSgeb).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/usuarios',
        params: { rol: 'mesero', activo: true, q: 'Juana' },
      }),
    )
  })

  it('maps the real Usuario wire record to the waiter view model, joining apellidos', async () => {
    vi.mocked(requestSgeb).mockResolvedValue(envelope([RECORD]))

    const result = await fetchWaiters({})

    expect(result).toEqual([
      {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        nombreCompleto: 'Juana Pérez López',
        correo: 'juana.perez@example.com',
        telefono: '+52 871 000 0001',
        estadoCuenta: 'activo',
      },
    ])
  })

  it('maps activo: false to estadoCuenta: inactivo', async () => {
    vi.mocked(requestSgeb).mockResolvedValue(envelope([{ ...RECORD, activo: false }]))

    const result = await fetchWaiters({})

    expect(result[0]?.estadoCuenta).toBe('inactivo')
  })

  it('never exposes an internal integer id — only the real uuid_usuario', async () => {
    vi.mocked(requestSgeb).mockResolvedValue(envelope([RECORD]))

    const result = await fetchWaiters({})

    expect(result[0]?.id).toBe(RECORD.uuid_usuario)
  })
})
