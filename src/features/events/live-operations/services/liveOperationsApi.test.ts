import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ChecklistTemplateViewModel } from '@/features/checklists/types/checklists'
import type { ChecklistInstanciaApiRecord } from '@/features/events/montage/services/montageApi'
import {
  buildClosureChecklist,
  isExitChecklistNotReadyError,
  markParticipantSalida,
} from '@/features/events/live-operations/services/liveOperationsApi'
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

  it('propagates a SGEB-4027 exit-checklist-not-ready error unchanged, with the safe backend message', async () => {
    const applicationError = new SgebApplicationError(409, {
      code: 'SGEB-4027',
      message:
        'Antes de registrar la salida, completa y haz que tu capitán apruebe el checklist de cierre.',
    })
    vi.mocked(requestSgeb).mockRejectedValue(applicationError)

    const error = await markParticipantSalida(5001).catch((e: unknown) => e)
    expect(error).toBe(applicationError)
  })
})

describe('isExitChecklistNotReadyError', () => {
  it('is true for a SgebApplicationError carrying SGEB-4027', () => {
    const error = new SgebApplicationError(409, {
      code: 'SGEB-4027',
      message:
        'Antes de registrar la salida, completa y haz que tu capitán apruebe el checklist de cierre.',
    })
    expect(isExitChecklistNotReadyError(error)).toBe(true)
  })

  it('is false for a different SgebApplicationError code (e.g. SGEB-4011)', () => {
    const error = new SgebApplicationError(409, {
      code: 'SGEB-4011',
      message:
        'Esta acción no está permitida en el estado actual. Actualiza la pantalla.',
    })
    expect(isExitChecklistNotReadyError(error)).toBe(false)
  })

  it('is false for a SgebNetworkError or an arbitrary thrown value', () => {
    expect(isExitChecklistNotReadyError(new SgebNetworkError('offline'))).toBe(false)
    expect(isExitChecklistNotReadyError(new Error('boom'))).toBe(false)
    expect(isExitChecklistNotReadyError(null)).toBe(false)
  })
})

describe('buildClosureChecklist', () => {
  const CIERRE_TEMPLATES: ReadonlyMap<number, ChecklistTemplateViewModel> = new Map([
    [
      2,
      {
        idChecklist: 2,
        nombre: 'Checklist de salida',
        tipo: 'cierre',
        activo: true,
        items: [
          {
            idItem: 20,
            descripcion: 'Recoger mantelería',
            cantidadEsperada: 1,
            orden: 1,
            activo: true,
          },
          {
            idItem: 21,
            descripcion: 'Devolver vajilla',
            cantidadEsperada: 12,
            orden: 2,
            activo: true,
          },
        ],
      },
    ],
  ])

  function instancia(
    overrides: Partial<ChecklistInstanciaApiRecord> = {},
  ): ChecklistInstanciaApiRecord {
    return {
      id_instancia: 7001,
      id_participacion: 5002,
      id_checklist: 2,
      completado: false,
      aprobado_en: null,
      fecha: '2026-08-25T00:00:00',
      respuestas: [
        { id_respuesta: 1, id_instancia: 7001, id_item: 20, cantidad: 1, hecho: true },
        { id_respuesta: 2, id_instancia: 7001, id_item: 21, cantidad: 5, hecho: false },
      ],
      ...overrides,
    }
  }

  it('returns undefined when there is no matching instance (no exit checklist assigned yet)', () => {
    expect(buildClosureChecklist([], CIERRE_TEMPLATES)).toBeUndefined()
  })

  it('returns undefined when the only instance belongs to a checklist outside the cierre-templates lookup (montaje/servicio/deactivated)', () => {
    const outOfScope = instancia({ id_checklist: 99 })
    expect(buildClosureChecklist([outOfScope], CIERRE_TEMPLATES)).toBeUndefined()
  })

  it('maps status to pending when completado is false', () => {
    const result = buildClosureChecklist(
      [instancia({ completado: false })],
      CIERRE_TEMPLATES,
    )
    expect(result?.status).toBe('pending')
  })

  it('maps status to completed when completado is true but aprobado_en is null — complete, not yet approved', () => {
    const result = buildClosureChecklist(
      [instancia({ completado: true, aprobado_en: null })],
      CIERRE_TEMPLATES,
    )
    expect(result?.status).toBe('completed')
    expect(result?.aprobadoEn).toBeNull()
  })

  it('maps status to approved when completado is true and aprobado_en is set — the persisted signal, not a transient one', () => {
    const result = buildClosureChecklist(
      [instancia({ completado: true, aprobado_en: '2026-08-26T20:00:00.000Z' })],
      CIERRE_TEMPLATES,
    )
    expect(result?.status).toBe('approved')
    expect(result?.aprobadoEn).toBe('2026-08-26T20:00:00.000Z')
  })

  it('never maps status to approved when completado is false, even if aprobado_en is somehow set — pending always wins', () => {
    const result = buildClosureChecklist(
      [instancia({ completado: false, aprobado_en: '2026-08-26T20:00:00.000Z' })],
      CIERRE_TEMPLATES,
    )
    expect(result?.status).toBe('pending')
  })

  it('computes pendientes as the count of respuestas with hecho: false', () => {
    const result = buildClosureChecklist([instancia()], CIERRE_TEMPLATES)
    expect(result?.pendientes).toBe(1)
  })

  it('joins item descriptions/cantidadEsperada from the template, keyed by idItem', () => {
    const result = buildClosureChecklist([instancia()], CIERRE_TEMPLATES)
    expect(result?.items).toEqual([
      {
        idItem: 20,
        descripcion: 'Recoger mantelería',
        cantidadEsperada: 1,
        cantidad: 1,
        hecho: true,
      },
      {
        idItem: 21,
        descripcion: 'Devolver vajilla',
        cantidadEsperada: 12,
        cantidad: 5,
        hecho: false,
      },
    ])
  })
})
