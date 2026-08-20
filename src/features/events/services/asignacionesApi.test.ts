import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fetchAsignaciones,
  type AsignacionMesaApiRecord,
} from '@/features/events/services/asignacionesApi'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

const RECORD: AsignacionMesaApiRecord = {
  id_asignacion: 701,
  id_participacion: 301,
  id_mesa: 501,
  vinculada: true,
  fecha_asignacion: '2026-09-12T17:00:00',
  fecha_vinculacion: '2026-09-12T17:45:00',
  mesa: {
    id_mesa: 501,
    id_evento: 1001,
    etiqueta: 'Mesa 1',
    codigo_qr: '3f2a9c14-1234-4abc-89ab-000000000000',
    nfc_uid: null,
    estado: 'ocupada',
  },
  participacion: {
    id_participacion: 301,
    id_evento: 1001,
    puesto: 'mesero',
    estado: 'vinculo',
    checklist_ok: true,
    usuario: {
      uuid_usuario: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      nombre: 'Ana',
      apellido_paterno: 'Torres',
      apellido_materno: null,
    },
  },
}

describe('fetchAsignaciones', () => {
  it('requests GET /eventos/{id}/asignaciones with the signal, mapped from the wire shape', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: [RECORD],
    })
    const controller = new AbortController()

    const result = await fetchAsignaciones(1001, undefined, controller.signal)

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/eventos/1001/asignaciones',
      signal: controller.signal,
    })
    expect(result).toEqual([
      {
        idAsignacion: 701,
        idParticipacion: 301,
        idMesa: 501,
        vinculada: true,
        fechaAsignacion: '2026-09-12T17:00:00',
        fechaVinculacion: '2026-09-12T17:45:00',
        mesa: { idMesa: 501, etiqueta: 'Mesa 1', estado: 'ocupada' },
        participacion: {
          idParticipacion: 301,
          puesto: 'mesero',
          estado: 'vinculo',
          checklistOk: true,
          usuario: {
            uuidUsuario: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            nombre: 'Ana',
            apellidoPaterno: 'Torres',
            apellidoMaterno: null,
          },
        },
      },
    ])
  })

  it('sends the vinculada filter only when explicitly provided', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: [],
    })

    await fetchAsignaciones(1001, { vinculada: true })

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/eventos/1001/asignaciones',
      params: { vinculada: true },
    })
  })

  it('resolves to an empty array when there are no assignments, not an error', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0002', message: 'Sin resultados.' },
      data: [],
    })

    expect(await fetchAsignaciones(999999)).toEqual([])
  })
})
