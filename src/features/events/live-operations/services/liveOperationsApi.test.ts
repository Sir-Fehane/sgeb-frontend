import { beforeEach, describe, expect, it, vi } from 'vitest'

import { markParticipantSalida } from '@/features/events/live-operations/services/liveOperationsApi'
import type { ParticipacionApiRecord } from '@/features/events/team-selection/services/teamSelectionApi'
import { SgebApplicationError, SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

const VINCULO_RECORD: ParticipacionApiRecord = {
  id_participacion: 5001,
  puesto: 'mesero',
  estado: 'vinculo',
  checklist_ok: true,
  usuario: {
    uuid_usuario: 'aa2a9c14-0000-4000-8000-000000000001',
    nombre: 'Juan',
    apellido_paterno: 'Pérez',
    apellido_materno: null,
    correo: 'juan@example.mx',
    telefono: null,
  },
}

describe('markParticipantSalida', () => {
  it('PATCHes /participaciones/{id}/estado with exactly { estado: "salida" }, no other fields', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: { ...VINCULO_RECORD, estado: 'salida' },
    })

    await markParticipantSalida(5001)

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/participaciones/5001/estado',
      method: 'PATCH',
      data: { estado: 'salida' },
    })
  })

  it('resolves to void even when the response omits usuario (the pinned backend does not preload it on this endpoint)', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: {
        id_participacion: 5001,
        puesto: 'mesero',
        estado: 'salida',
        checklist_ok: true,
      },
    })

    await expect(markParticipantSalida(5001)).resolves.toBeUndefined()
  })

  it('throws a SgebNetworkError if the envelope carries null data on success (defensive guard)', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: null,
    })

    const error = await markParticipantSalida(5001).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(SgebNetworkError)
  })

  it('propagates a SGEB-4011 invalid-transition error unchanged', async () => {
    const applicationError = new SgebApplicationError(409, {
      code: 'SGEB-4011',
      message:
        'Esta acción no está permitida en el estado actual. Actualiza la pantalla.',
    })
    vi.mocked(requestSgeb).mockRejectedValue(applicationError)

    const error = await markParticipantSalida(5001).catch((e: unknown) => e)
    expect(error).toBe(applicationError)
  })
})
