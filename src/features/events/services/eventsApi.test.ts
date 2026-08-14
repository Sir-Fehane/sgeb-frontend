import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  mapEventoToListItem,
  type EventoApiRecord,
} from '@/features/events/services/eventsApi'
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
