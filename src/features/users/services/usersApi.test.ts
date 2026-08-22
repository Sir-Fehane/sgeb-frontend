import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fetchUser,
  fetchUsers,
  setUserActive,
  toUsersListParams,
  updateUser,
  type UsuarioApiRecord,
} from '@/features/users/services/usersApi'
import { DEFAULT_USERS_FILTER_STATE } from '@/features/users/types/user'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

const RECORD: UsuarioApiRecord = {
  uuid_usuario: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  nombre: 'María',
  apellido_paterno: 'López',
  apellido_materno: 'García',
  correo: 'maria.lopez@example.com',
  telefono: '+528711234567',
  activo: true,
  creado_en: '2026-01-05T10:00:00',
  rol: { id_rol: 2, nombre: 'capitan', descripcion: 'Capitán de evento', activo: true },
}

function envelope(data: unknown) {
  return { result: { code: 'SGEB-0000', message: 'ok' }, data }
}

describe('toUsersListParams', () => {
  it('sends no params for the default (todos/todos/empty) filter state', () => {
    expect(toUsersListParams(DEFAULT_USERS_FILTER_STATE)).toEqual({})
  })

  it('maps rol/estadoCuenta/search to the real rol/activo/q server params', () => {
    expect(
      toUsersListParams({
        rol: 'capitan',
        estadoCuenta: 'inactivo',
        search: '  María  ',
      }),
    ).toEqual({ rol: 'capitan', activo: false, q: 'María' })
  })
})

describe('fetchUsers', () => {
  it('sends the given params to GET /usuarios, with no pagination params invented', async () => {
    vi.mocked(requestSgeb).mockResolvedValue(envelope([RECORD]))

    await fetchUsers({ rol: 'capitan', activo: true, q: 'María' })

    expect(requestSgeb).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/usuarios',
        params: { rol: 'capitan', activo: true, q: 'María' },
      }),
    )
  })

  it('maps the nested rol object, not a flat rol string — the real wire shape, not what OpenAPI documents', async () => {
    vi.mocked(requestSgeb).mockResolvedValue(envelope([RECORD]))

    const [user] = await fetchUsers({})

    expect(user?.rol).toEqual({
      idRol: 2,
      nombre: 'capitan',
      descripcion: 'Capitán de evento',
    })
    expect(user?.nombreCompleto).toBe('María López García')
    expect(user?.estadoCuenta).toBe('activo')
  })

  it('degrades to rol: null when the wire record has no rol relation, rather than throwing', async () => {
    const { rol: _rol, ...withoutRol } = RECORD
    vi.mocked(requestSgeb).mockResolvedValue(envelope([withoutRol]))

    const [user] = await fetchUsers({})

    expect(user?.rol).toBeNull()
  })

  it('returns an empty array for a null data payload rather than throwing', async () => {
    vi.mocked(requestSgeb).mockResolvedValue(envelope(null))

    await expect(fetchUsers({})).resolves.toEqual([])
  })
})

describe('fetchUser', () => {
  it('requests GET /usuarios/{uuid} and maps the single record', async () => {
    vi.mocked(requestSgeb).mockResolvedValue(envelope(RECORD))

    const user = await fetchUser(RECORD.uuid_usuario)

    expect(requestSgeb).toHaveBeenCalledWith(
      expect.objectContaining({ url: `/usuarios/${RECORD.uuid_usuario}` }),
    )
    expect(user.uuidUsuario).toBe(RECORD.uuid_usuario)
  })
})

describe('updateUser', () => {
  it('sends exactly the editable field set to PUT /usuarios/{uuid} — never correo, rol, or activo', async () => {
    vi.mocked(requestSgeb).mockResolvedValue(envelope(RECORD))

    await updateUser(RECORD.uuid_usuario, {
      nombre: 'María',
      apellidoPaterno: 'López',
      apellidoMaterno: null,
      telefono: null,
    })

    expect(requestSgeb).toHaveBeenCalledWith({
      url: `/usuarios/${RECORD.uuid_usuario}`,
      method: 'PUT',
      data: {
        nombre: 'María',
        apellidoPaterno: 'López',
        apellidoMaterno: null,
        telefono: null,
      },
    })
  })
})

describe('setUserActive', () => {
  it('sends {activo} to PATCH /usuarios/{uuid}', async () => {
    vi.mocked(requestSgeb).mockResolvedValue(envelope({ ...RECORD, activo: false }))

    const user = await setUserActive(RECORD.uuid_usuario, false)

    expect(requestSgeb).toHaveBeenCalledWith({
      url: `/usuarios/${RECORD.uuid_usuario}`,
      method: 'PATCH',
      data: { activo: false },
    })
    expect(user.estadoCuenta).toBe('inactivo')
  })
})
