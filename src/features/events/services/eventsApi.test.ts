import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  changeEventoEstado,
  createEvento,
  isEventoNotFoundError,
  mapEventoToDetail,
  mapEventoToListItem,
  updateEvento,
  type CreateEventoRequest,
  type EventoApiRecord,
  type UpdateEventoRequest,
} from '@/features/events/services/eventsApi'
import { SgebApplicationError, SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

const RECORD: EventoApiRecord = {
  id_evento: 1001,
  id_salon: 3,
  capitan: {
    uuid_usuario: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    nombre: 'Capitán',
    apellido_paterno: 'Prueba',
    apellido_materno: null,
    correo: 'capitan.prueba@example.com',
  },
  titulo: 'Boda García',
  tipo: 'social',
  fecha: '2026-09-12',
  hora_presentacion: '16:00',
  inicio: '2026-09-12T18:00:00',
  fin: null,
  cupo_meseros: 12,
  num_mesas: 20,
  tarifa_por_mesero: 450,
  radio_geocerca_m: 150,
  estado: 'publicado',
  creado_en: '2026-07-01T09:00:00',
  comanda_url: 'comandas/1001/3f2a9c14-fake.pdf',
}

describe('mapEventoToListItem', () => {
  it('maps every documented Evento field from snake_case to the view model', () => {
    expect(mapEventoToListItem(RECORD)).toEqual({
      idEvento: 1001,
      idSalon: 3,
      capitan: {
        uuidUsuario: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        nombre: 'Capitán',
        apellidoPaterno: 'Prueba',
        apellidoMaterno: null,
        correo: 'capitan.prueba@example.com',
      },
      titulo: 'Boda García',
      tipo: 'social',
      fecha: '2026-09-12',
      horaPresentacion: '16:00',
      inicio: '2026-09-12T18:00:00',
      fin: null,
      cupoMeseros: 12,
      numMesas: 20,
      tarifaPorMesero: 450,
      radioGeocercaM: 150,
      estado: 'publicado',
      creadoEn: '2026-07-01T09:00:00',
    })
  })

  it('never invents salonNombre — not a documented response field; capitan IS mapped', () => {
    const mapped = mapEventoToListItem(RECORD)
    expect(mapped.salonNombre).toBeUndefined()
    expect(mapped.capitan.uuidUsuario).toBe(RECORD.capitan.uuid_usuario)
  })
})

describe('fetchEventos', () => {
  it('requests GET /eventos with the given params and signal, and maps the array in `data`', async () => {
    const { fetchEventos } = await import('@/features/events/services/eventsApi')
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: [RECORD],
    })
    const controller = new AbortController()

    const result = await fetchEventos({ estado: 'publicado' }, controller.signal)

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/eventos',
      params: { estado: 'publicado' },
      signal: controller.signal,
    })
    expect(result).toEqual([mapEventoToListItem(RECORD)])
  })

  it('resolves to an empty array on SGEB-0002 (empty result), not an error', async () => {
    const { fetchEventos } = await import('@/features/events/services/eventsApi')
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0002', message: 'Sin resultados.' },
      data: [],
    })

    const result = await fetchEventos({})

    expect(result).toEqual([])
  })
})

describe('mapEventoToDetail', () => {
  it('maps the fields the Event Detail view model actually uses', () => {
    expect(mapEventoToDetail(RECORD)).toEqual({
      idEvento: 1001,
      idSalon: 3,
      capitan: {
        uuidUsuario: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        nombre: 'Capitán',
        apellidoPaterno: 'Prueba',
        apellidoMaterno: null,
        correo: 'capitan.prueba@example.com',
      },
      titulo: 'Boda García',
      tipo: 'social',
      estado: 'publicado',
      fecha: '2026-09-12',
      horaPresentacion: '16:00',
      inicio: '2026-09-12T18:00:00',
      cupoMeseros: 12,
      numMesas: 20,
      tarifaPorMesero: 450,
      radioGeocercaM: 150,
    })
  })

  it('never populates salonNombre (undocumented preload); comandaUrl has no field to populate at all', () => {
    const mapped = mapEventoToDetail(RECORD)
    expect(mapped.salonNombre).toBeUndefined()
    expect(mapped).not.toHaveProperty('comandaUrl')
  })

  it('never reads record.comanda_url even when present, and never leaks it into the mapped view model', () => {
    const mapped = mapEventoToDetail(RECORD)
    expect(JSON.stringify(mapped)).not.toContain(RECORD.comanda_url)
  })
})

describe('isEventoNotFoundError', () => {
  it('is true only for SGEB-3001', () => {
    expect(
      isEventoNotFoundError(
        new SgebApplicationError(404, { code: 'SGEB-3001', message: 'No encontrado.' }),
      ),
    ).toBe(true)
  })

  it('is false for any other SgebApplicationError code', () => {
    expect(
      isEventoNotFoundError(
        new SgebApplicationError(500, { code: 'SGEB-5008', message: 'Falla técnica.' }),
      ),
    ).toBe(false)
  })

  it('is false for a SgebNetworkError and for non-SGEB values', () => {
    expect(isEventoNotFoundError(new SgebNetworkError('Sin conexión.'))).toBe(false)
    expect(isEventoNotFoundError(new Error('boom'))).toBe(false)
    expect(isEventoNotFoundError(undefined)).toBe(false)
  })
})

describe('fetchEventoDetalle', () => {
  it('requests GET /eventos/{id} with the signal, and maps the single record in `data`', async () => {
    const { fetchEventoDetalle } = await import('@/features/events/services/eventsApi')
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: RECORD,
    })
    const controller = new AbortController()

    const result = await fetchEventoDetalle(1001, controller.signal)

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/eventos/1001',
      signal: controller.signal,
    })
    expect(result).toEqual(mapEventoToDetail(RECORD))
  })

  it('propagates a SgebApplicationError (e.g. SGEB-3001) unchanged rather than swallowing it', async () => {
    const { fetchEventoDetalle } = await import('@/features/events/services/eventsApi')
    const notFound = new SgebApplicationError(404, {
      code: 'SGEB-3001',
      message: 'No encontramos la información solicitada.',
    })
    vi.mocked(requestSgeb).mockRejectedValue(notFound)

    await expect(fetchEventoDetalle(999999)).rejects.toBe(notFound)
  })

  it('throws a SgebNetworkError if the envelope carries null data on success (defensive guard)', async () => {
    const { fetchEventoDetalle } = await import('@/features/events/services/eventsApi')
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: null,
    })

    const error = await fetchEventoDetalle(1001).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(SgebNetworkError)
  })
})

const CREATE_REQUEST: CreateEventoRequest = {
  idSalon: 1,
  uuidCapitan: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
  titulo: 'Evento nuevo',
  tipo: 'social',
  fecha: '2099-01-10',
  horaPresentacion: '16:00',
  inicio: '2099-01-10T18:00:00',
  cupoMeseros: 5,
  numMesas: 10,
  tarifaPorMesero: 400,
  radioGeocercaM: 150,
}

/**
 * Deliberately has NO `capitan` field — confirmed real shape of `POST
 * /eventos`'s response (`EventoService.crear` never preloads it, unlike
 * `.obtener()`/`.listar()`, which `RECORD` above correctly represents for
 * the read paths). `createEvento` reads only `id_evento` from this record
 * — see its own comment in `eventsApi.ts` for the full `TypeError`
 * regression this fixture (and the tests below) guard against.
 */
const CREATE_RESPONSE_RECORD: Omit<EventoApiRecord, 'capitan'> = {
  id_evento: 1001,
  id_salon: 3,
  titulo: 'Boda García',
  tipo: 'social',
  fecha: '2026-09-12',
  hora_presentacion: '16:00',
  inicio: '2026-09-12T18:00:00',
  fin: null,
  cupo_meseros: 12,
  num_mesas: 20,
  tarifa_por_mesero: 450,
  radio_geocerca_m: 150,
  estado: 'borrador',
  creado_en: '2026-07-01T09:00:00',
}

describe('createEvento', () => {
  it('POSTs /eventos with exactly the given camelCase body, no extra fields', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'Registro creado correctamente.' },
      data: CREATE_RESPONSE_RECORD,
    })

    await createEvento(CREATE_REQUEST)

    expect(requestSgeb).toHaveBeenCalledTimes(1)
    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/eventos',
      method: 'POST',
      data: CREATE_REQUEST,
    })
  })

  it('never sends an estado field — the server always sets borrador', () => {
    expect(CREATE_REQUEST).not.toHaveProperty('estado')
  })

  it('resolves with just the created idEvento from a real HTTP 201 SGEB-0001 response whose data has no capitan — never throws, never mistakes a real success for "Ocurrió un error inesperado." (regression: mapEventoToDetail/mapCapitan previously dereferenced the always-absent capitan field on this endpoint and crashed)', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'Registro creado correctamente.' },
      data: CREATE_RESPONSE_RECORD,
    })

    const result = await createEvento(CREATE_REQUEST)

    expect(result).toEqual({ idEvento: 1001 })
  })

  it('throws a SgebNetworkError if the envelope carries null data on success (defensive guard)', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'Creado.' },
      data: null,
    })

    await expect(createEvento(CREATE_REQUEST)).rejects.toBeInstanceOf(SgebNetworkError)
  })

  it('lets a SgebApplicationError (e.g. SGEB-4001 salón ocupado) propagate unchanged', async () => {
    const error = new SgebApplicationError(409, {
      code: 'SGEB-4001',
      message: 'El salón ya tiene un evento en esa fecha.',
    })
    vi.mocked(requestSgeb).mockRejectedValue(error)

    await expect(createEvento(CREATE_REQUEST)).rejects.toBe(error)
  })
})

describe('updateEvento', () => {
  it('PUTs /eventos/{id} with exactly the given body, no id_salon/fecha/inicio/estado', async () => {
    const request: UpdateEventoRequest = { titulo: 'Título actualizado', numMesas: 12 }
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: RECORD,
    })

    await updateEvento(1001, request)

    expect(requestSgeb).toHaveBeenCalledTimes(1)
    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/eventos/1001',
      method: 'PUT',
      data: request,
    })
  })

  it('throws a SgebNetworkError if the envelope carries null data on success (defensive guard)', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: null,
    })

    await expect(updateEvento(1001, {})).rejects.toBeInstanceOf(SgebNetworkError)
  })

  it('lets a SgebApplicationError (e.g. SGEB-4013 finalizado/cancelado) propagate unchanged', async () => {
    const error = new SgebApplicationError(409, {
      code: 'SGEB-4013',
      message: 'El evento no admite esta operación en su estado actual.',
    })
    vi.mocked(requestSgeb).mockRejectedValue(error)

    await expect(updateEvento(1001, { titulo: 'x' })).rejects.toBe(error)
  })
})

describe('changeEventoEstado', () => {
  it('PATCHes /eventos/{id}/estado with exactly { estado }, no extra fields, no client fin', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: { ...RECORD, estado: 'publicado' },
    })

    await changeEventoEstado(1001, 'publicado')

    expect(requestSgeb).toHaveBeenCalledTimes(1)
    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/eventos/1001/estado',
      method: 'PATCH',
      data: { estado: 'publicado' },
    })
  })

  it('works for every documented transition target', async () => {
    for (const estado of ['borrador', 'publicado', 'en_curso', 'cancelado'] as const) {
      vi.mocked(requestSgeb).mockResolvedValue({
        result: { code: 'SGEB-0000', message: 'ok' },
        data: { ...RECORD, estado },
      })

      await changeEventoEstado(1001, estado)

      expect(requestSgeb).toHaveBeenLastCalledWith({
        url: '/eventos/1001/estado',
        method: 'PATCH',
        data: { estado },
      })
    }
  })

  it('throws a SgebNetworkError if the envelope carries null data on success (defensive guard)', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: null,
    })

    await expect(changeEventoEstado(1001, 'publicado')).rejects.toBeInstanceOf(
      SgebNetworkError,
    )
  })

  it('resolves successfully even when the response omits capitan (confirmed backend gap: cambiarEstado never preloads it) — regression for the false publish-failure bug', async () => {
    // The pinned backend's `EventoService.cambiarEstado` genuinely responds
    // like this — a real, successfully-updated Evento, but without the
    // `capitan` key at all (unlike `obtener`/`listar`, which preload it).
    // `changeEventoEstado` must never attempt to map that shape (it used
    // to, and threw here).
    const { capitan: _capitan, ...withoutCapitan } = RECORD
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: { ...withoutCapitan, estado: 'publicado' },
    })

    await expect(changeEventoEstado(1001, 'publicado')).resolves.toBeUndefined()
  })

  it('lets a SgebApplicationError (e.g. SGEB-4013 sin mesas) propagate unchanged', async () => {
    const error = new SgebApplicationError(409, {
      code: 'SGEB-4013',
      message: 'Este evento no tiene mesas registradas.',
    })
    vi.mocked(requestSgeb).mockRejectedValue(error)

    await expect(changeEventoEstado(1001, 'publicado')).rejects.toBe(error)
  })

  it('lets SGEB-4011 (invalid transition) propagate unchanged', async () => {
    const error = new SgebApplicationError(409, {
      code: 'SGEB-4011',
      message: 'Esta transición de estado no es válida.',
    })
    vi.mocked(requestSgeb).mockRejectedValue(error)

    await expect(changeEventoEstado(1001, 'finalizado')).rejects.toBe(error)
  })
})
