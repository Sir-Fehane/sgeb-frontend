import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createMesa,
  fetchMesas,
  type CreateMesaRequest,
  type MesaApiRecord,
} from '@/features/events/services/mesasApi'
import { SgebApplicationError, SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

const RECORD: MesaApiRecord = {
  id_mesa: 501,
  id_evento: 1001,
  etiqueta: 'Mesa 1',
  codigo_qr: '3f2a9c14-1234-4abc-89ab-000000000000',
  nfc_uid: null,
  estado: 'libre',
}

describe('fetchMesas', () => {
  it('requests GET /eventos/{id}/mesas with the signal, mapped from the wire shape', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: [RECORD],
    })
    const controller = new AbortController()

    const result = await fetchMesas(1001, controller.signal)

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/eventos/1001/mesas',
      signal: controller.signal,
    })
    expect(result).toEqual([
      { idMesa: 501, etiqueta: 'Mesa 1', estado: 'libre', codigoQr: RECORD.codigo_qr },
    ])
  })

  it('resolves to an empty array when there are no mesas, not an error', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0002', message: 'Sin resultados.' },
      data: [],
    })

    expect(await fetchMesas(1001)).toEqual([])
  })
})

describe('createMesa', () => {
  it('POSTs /eventos/{id}/mesas with exactly the given body — never a client codigo_qr', async () => {
    const request: CreateMesaRequest = { etiqueta: 'Mesa 2' }
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'Creado.' },
      data: RECORD,
    })

    await createMesa(1001, request)

    expect(requestSgeb).toHaveBeenCalledTimes(1)
    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/eventos/1001/mesas',
      method: 'POST',
      data: request,
    })
    expect(request).not.toHaveProperty('codigoQr')
  })

  it('throws a SgebNetworkError if the envelope carries null data on success (defensive guard)', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'Creado.' },
      data: null,
    })

    await expect(createMesa(1001, { etiqueta: 'Mesa 2' })).rejects.toBeInstanceOf(
      SgebNetworkError,
    )
  })

  it('propagates a duplicate etiqueta (SGEB-2013) as the backend-approved friendly message, never raw DB/constraint text', async () => {
    const error = new SgebApplicationError(409, {
      code: 'SGEB-2013',
      message: 'Ya existe un registro con ese dato. Verifica la información.',
      technical_message:
        "MESA.etiqueta='Mesa 1' ya existe en el evento 1001. Restricción: mesa_id_evento_etiqueta_unique.",
    })
    vi.mocked(requestSgeb).mockRejectedValue(error)

    await expect(createMesa(1001, { etiqueta: 'Mesa 1' })).rejects.toBe(error)
    try {
      await createMesa(1001, { etiqueta: 'Mesa 1' })
      expect.unreachable()
    } catch (thrown) {
      expect(thrown).toBeInstanceOf(SgebApplicationError)
      const sgebError = thrown as SgebApplicationError
      expect(sgebError.code).toBe('SGEB-2013')
      expect(sgebError.message).toBe(
        'Ya existe un registro con ese dato. Verifica la información.',
      )
    }
  })
})
