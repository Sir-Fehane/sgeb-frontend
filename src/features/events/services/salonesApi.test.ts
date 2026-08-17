import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createSalon,
  fetchSalones,
  mapSalonToOption,
  type CreateSalonRequest,
  type SalonApiRecord,
} from '@/features/events/services/salonesApi'
import { SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

const RECORD: SalonApiRecord = {
  id_salon: 1,
  nombre: 'Salón Roble',
  calle: 'Calle 1',
  cp: '00000',
  colonia: 'Centro',
  ciudad: 'CDMX',
  estado: 'CDMX',
  latitud: 19.4,
  longitud: -99.1,
  capacidad_max_mesas: 40,
  capacidad_personas: 200,
  activo: true,
}

describe('mapSalonToOption', () => {
  it('maps only idSalon/nombre/capacidadMaxMesas — no address/geolocation fields', () => {
    expect(mapSalonToOption(RECORD)).toEqual({
      idSalon: 1,
      nombre: 'Salón Roble',
      capacidadMaxMesas: 40,
    })
  })
})

describe('fetchSalones', () => {
  it('requests GET /salones with the given params and signal, mapped to picker options', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: [RECORD],
    })
    const controller = new AbortController()

    const result = await fetchSalones({ activo: true }, controller.signal)

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/salones',
      params: { activo: true },
      signal: controller.signal,
    })
    expect(result).toEqual([mapSalonToOption(RECORD)])
  })

  it('resolves to an empty array when there are no salones, not an error', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0002', message: 'Sin resultados.' },
      data: [],
    })

    expect(await fetchSalones({ activo: true })).toEqual([])
  })
})

const CREATE_REQUEST: CreateSalonRequest = {
  nombre: 'Salón Nuevo',
  calle: 'Av. Reforma 100',
  cp: '06600',
  colonia: 'Juárez',
  ciudad: 'CDMX',
  estado: 'CDMX',
  latitud: 19.42,
  longitud: -99.16,
  capacidadMaxMesas: 30,
  capacidadPersonas: 150,
}

describe('createSalon', () => {
  it('POSTs /salones with exactly the given camelCase body', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'Creado.' },
      data: RECORD,
    })

    await createSalon(CREATE_REQUEST)

    expect(requestSgeb).toHaveBeenCalledTimes(1)
    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/salones',
      method: 'POST',
      data: CREATE_REQUEST,
    })
  })

  it('returns the created salón already mapped to a picker option', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'Creado.' },
      data: RECORD,
    })

    expect(await createSalon(CREATE_REQUEST)).toEqual(mapSalonToOption(RECORD))
  })

  it('throws a SgebNetworkError if the envelope carries null data on success (defensive guard)', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'Creado.' },
      data: null,
    })

    await expect(createSalon(CREATE_REQUEST)).rejects.toBeInstanceOf(SgebNetworkError)
  })
})
