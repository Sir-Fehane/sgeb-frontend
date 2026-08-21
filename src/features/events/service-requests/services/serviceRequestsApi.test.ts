import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fetchServiceRequests,
  updateServiceRequestStatus,
  type ServiceRequestApiRecord,
} from '@/features/events/service-requests/services/serviceRequestsApi'
import { SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

const RECORD: ServiceRequestApiRecord = {
  id_solicitud: 7,
  id_mesa: 12,
  id_participacion: null,
  tipo: 'atencion',
  estado: 'pendiente',
  creada_en: '2026-09-12T20:00:00Z',
  atendida_en: null,
}

describe('fetchServiceRequests', () => {
  it('requests GET /eventos/{id}/solicitudes and maps every field, camelCase', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: [RECORD],
    })

    const result = await fetchServiceRequests(1001, 'pendiente')

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/eventos/1001/solicitudes',
      params: { estado: 'pendiente' },
    })
    expect(result).toEqual([
      {
        idSolicitud: 7,
        idMesa: 12,
        idParticipacion: null,
        tipo: 'atencion',
        estado: 'pendiente',
        creadaEn: '2026-09-12T20:00:00Z',
        atendidaEn: null,
      },
    ])
  })

  it('omits the estado param when the filter is "todas"', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: [RECORD],
    })

    await fetchServiceRequests(1001, 'todas')

    expect(requestSgeb).toHaveBeenCalledWith({ url: '/eventos/1001/solicitudes' })
  })

  it('returns an empty array for a SGEB-0002 empty list, never an error', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0002', message: 'Sin resultados.' },
      data: [],
    })

    const result = await fetchServiceRequests(1001, 'pendiente')

    expect(result).toEqual([])
  })
})

describe('updateServiceRequestStatus', () => {
  it('PATCHes /solicitudes/{id}/estado with only estado, never a client-supplied id_participacion', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: { ...RECORD, estado: 'atendida' },
    })

    const result = await updateServiceRequestStatus(7, 'atendida')

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/solicitudes/7/estado',
      method: 'PATCH',
      data: { estado: 'atendida' },
    })
    expect(result.estado).toBe('atendida')
  })

  it('throws SgebNetworkError when data is null', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: null,
    })

    await expect(updateServiceRequestStatus(7, 'cancelada')).rejects.toBeInstanceOf(
      SgebNetworkError,
    )
  })
})
