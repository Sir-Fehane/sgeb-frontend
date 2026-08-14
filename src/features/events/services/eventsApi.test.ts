import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  isEventoNotFoundError,
  mapEventoToDetail,
  mapEventoToListItem,
  type EventoApiRecord,
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
}

describe('mapEventoToListItem', () => {
  it('maps every documented Evento field from snake_case to the view model', () => {
    expect(mapEventoToListItem(RECORD)).toEqual({
      idEvento: 1001,
      idSalon: 3,
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

  it('never invents salonNombre/capitanNombre — neither is a documented response field', () => {
    const mapped = mapEventoToListItem(RECORD)
    expect(mapped.salonNombre).toBeUndefined()
    expect(mapped.capitanNombre).toBeUndefined()
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

  it('never populates salonNombre (undocumented preload) or comandaUrl (internal storage key)', () => {
    const mapped = mapEventoToDetail(RECORD)
    expect(mapped.salonNombre).toBeUndefined()
    expect(mapped.comandaUrl).toBeUndefined()
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
