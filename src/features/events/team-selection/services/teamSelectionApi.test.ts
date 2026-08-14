import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fetchParticipaciones,
  mapParticipacionToViewModel,
  selectParticipant,
  type ParticipacionApiRecord,
} from '@/features/events/team-selection/services/teamSelectionApi'
import { SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

const CANDIDATO_RECORD: ParticipacionApiRecord = {
  id_participacion: 5001,
  puesto: 'mesero',
  estado: 'aparto',
  checklist_ok: false,
  usuario: {
    uuid_usuario: 'aa2a9c14-0000-4000-8000-000000000001',
    nombre: 'Juan',
    apellido_paterno: 'Pérez',
    apellido_materno: null,
    correo: 'juan@example.mx',
    telefono: null,
  },
}

const SELECCIONADO_RECORD: ParticipacionApiRecord = {
  id_participacion: 5002,
  puesto: 'barra',
  estado: 'seleccionado',
  checklist_ok: false,
  usuario: {
    uuid_usuario: 'aa2a9c14-0000-4000-8000-000000000002',
    nombre: 'Ana',
    apellido_paterno: 'García',
    apellido_materno: 'López',
    correo: 'ana@example.mx',
    telefono: '5512345678',
  },
}

describe('mapParticipacionToViewModel', () => {
  it('maps id_participacion, puesto, estado, and composes nombre without apellido_materno when null', () => {
    expect(mapParticipacionToViewModel(CANDIDATO_RECORD)).toEqual({
      idParticipacion: 5001,
      nombre: 'Juan Pérez',
      puesto: 'mesero',
      estado: 'aparto',
    })
  })

  it('composes nombre with apellido_materno when present', () => {
    expect(mapParticipacionToViewModel(SELECCIONADO_RECORD)).toEqual({
      idParticipacion: 5002,
      nombre: 'Ana García López',
      puesto: 'barra',
      estado: 'seleccionado',
    })
  })

  it('never exposes uuid_usuario, correo, telefono, or checklist_ok on the view model', () => {
    const mapped = mapParticipacionToViewModel(SELECCIONADO_RECORD)
    expect(mapped).not.toHaveProperty('uuidUsuario')
    expect(mapped).not.toHaveProperty('correo')
    expect(mapped).not.toHaveProperty('telefono')
    expect(mapped).not.toHaveProperty('checklistOk')
  })
})

describe('fetchParticipaciones', () => {
  it('requests GET /eventos/{id}/participaciones with the signal, and maps every row in `data`', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: [CANDIDATO_RECORD, SELECCIONADO_RECORD],
    })
    const controller = new AbortController()

    const result = await fetchParticipaciones(1001, controller.signal)

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/eventos/1001/participaciones',
      signal: controller.signal,
    })
    expect(result).toEqual([
      mapParticipacionToViewModel(CANDIDATO_RECORD),
      mapParticipacionToViewModel(SELECCIONADO_RECORD),
    ])
  })

  it('resolves to an empty array on SGEB-0002 (empty roster), not an error', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0002', message: 'Sin resultados.' },
      data: [],
    })

    const result = await fetchParticipaciones(1001)

    expect(result).toEqual([])
  })
})

describe('selectParticipant', () => {
  it('PATCHes /participaciones/{id}/estado with exactly { estado: "seleccionado" }, no other fields', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: CANDIDATO_RECORD,
    })

    await selectParticipant(5001)

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/participaciones/5001/estado',
      method: 'PATCH',
      data: { estado: 'seleccionado' },
    })
  })

  it('maps the updated participation in the response', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: { ...CANDIDATO_RECORD, estado: 'seleccionado' },
    })

    const result = await selectParticipant(5001)

    expect(result.estado).toBe('seleccionado')
  })

  it('throws a SgebNetworkError if the envelope carries null data on success (defensive guard)', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: null,
    })

    const error = await selectParticipant(5001).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(SgebNetworkError)
  })
})
