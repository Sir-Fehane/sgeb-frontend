import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fetchRoles } from '@/features/waiters/services/rolesApi'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

describe('fetchRoles', () => {
  it('maps the real GET /roles catalog, never a hardcoded id', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: [
        { id_rol: 1, nombre: 'admin', descripcion: null, activo: true },
        { id_rol: 2, nombre: 'capitan', descripcion: null, activo: true },
        { id_rol: 3, nombre: 'mesero', descripcion: null, activo: true },
      ],
    })

    const result = await fetchRoles()

    expect(result).toEqual([
      { idRol: 1, nombre: 'admin' },
      { idRol: 2, nombre: 'capitan' },
      { idRol: 3, nombre: 'mesero' },
    ])
    expect(requestSgeb).toHaveBeenCalledWith(expect.objectContaining({ url: '/roles' }))
  })
})
