import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  approveChecklistInstancia,
  buildMontageChecklist,
  fetchChecklistInstancias,
  fetchMontageChecklistTemplates,
  fetchMontageParticipants,
  type ChecklistApiRecord,
  type ChecklistInstanciaApiRecord,
  type ChecklistTemplateViewModel,
  type ParticipacionApiRecord,
} from '@/features/events/montage/services/montageApi'
import { SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

const APARTO_RECORD: ParticipacionApiRecord = {
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
  checklist_ok: true,
  usuario: {
    uuid_usuario: 'aa2a9c14-0000-4000-8000-000000000002',
    nombre: 'Ana',
    apellido_paterno: 'García',
    apellido_materno: 'López',
    correo: 'ana@example.mx',
    telefono: '5512345678',
  },
}

describe('fetchMontageParticipants', () => {
  it('requests GET /eventos/{id}/participaciones and excludes estado: aparto', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: [APARTO_RECORD, SELECCIONADO_RECORD],
    })

    const result = await fetchMontageParticipants(1001)

    expect(requestSgeb).toHaveBeenCalledWith({ url: '/eventos/1001/participaciones' })
    expect(result).toEqual([
      {
        idParticipacion: 5002,
        nombre: 'Ana García López',
        puesto: 'barra',
        estado: 'seleccionado',
        checklistOk: true,
      },
    ])
  })

  it('propagates the signal', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: [],
    })
    const controller = new AbortController()

    await fetchMontageParticipants(1001, controller.signal)

    expect(requestSgeb).toHaveBeenCalledWith(
      expect.objectContaining({ signal: controller.signal }),
    )
  })
})

describe('fetchMontageChecklistTemplates', () => {
  const TEMPLATE_RECORD: ChecklistApiRecord = {
    id_checklist: 1,
    nombre: 'Montaje de estación',
    tipo: 'montaje',
    activo: true,
    items: [
      {
        id_item: 10,
        id_checklist: 1,
        descripcion: 'Colocar mantelería',
        cantidad_esperada: 1,
        orden: 1,
        activo: true,
      },
      {
        id_item: 11,
        id_checklist: 1,
        descripcion: 'Acomodar sillas',
        cantidad_esperada: 8,
        orden: 2,
        activo: true,
      },
    ],
  }

  it('requests GET /checklists?tipo=montaje and projects items into a lookup by id_item', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: [TEMPLATE_RECORD],
    })

    const result = await fetchMontageChecklistTemplates()

    expect(requestSgeb).toHaveBeenCalledWith({
      params: { tipo: 'montaje' },
      url: '/checklists',
    })
    expect(result).toEqual([
      {
        idChecklist: 1,
        nombre: 'Montaje de estación',
        items: new Map([
          [10, { descripcion: 'Colocar mantelería', cantidadEsperada: 1 }],
          [11, { descripcion: 'Acomodar sillas', cantidadEsperada: 8 }],
        ]),
      },
    ])
  })
})

describe('fetchChecklistInstancias', () => {
  it('requests GET /participaciones/{id}/checklist-instancias and returns the raw array unmapped', async () => {
    const record: ChecklistInstanciaApiRecord = {
      id_instancia: 9001,
      id_participacion: 5002,
      id_checklist: 1,
      completado: false,
      fecha: '2026-08-01T00:00:00',
      respuestas: [],
    }
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: [record],
    })

    const result = await fetchChecklistInstancias(5002)

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/participaciones/5002/checklist-instancias',
    })
    expect(result).toEqual([record])
  })

  it('resolves to an empty array when data is null/empty (no instance created yet)', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0002', message: 'Sin resultados.' },
      data: [],
    })

    expect(await fetchChecklistInstancias(5002)).toEqual([])
  })
})

describe('buildMontageChecklist', () => {
  const TEMPLATES: ReadonlyMap<number, ChecklistTemplateViewModel> = new Map([
    [
      1,
      {
        idChecklist: 1,
        nombre: 'Montaje de estación',
        items: new Map([
          [10, { descripcion: 'Colocar mantelería', cantidadEsperada: 1 }],
          [11, { descripcion: 'Acomodar sillas', cantidadEsperada: 8 }],
        ]),
      },
    ],
  ])

  function instancia(
    overrides: Partial<ChecklistInstanciaApiRecord> = {},
  ): ChecklistInstanciaApiRecord {
    return {
      id_instancia: 9001,
      id_participacion: 5002,
      id_checklist: 1,
      completado: false,
      fecha: '2026-08-01T00:00:00',
      respuestas: [
        { id_respuesta: 1, id_instancia: 9001, id_item: 10, cantidad: 1, hecho: true },
        { id_respuesta: 2, id_instancia: 9001, id_item: 11, cantidad: 3, hecho: false },
      ],
      ...overrides,
    }
  }

  it('returns undefined when there is no matching instance', () => {
    expect(buildMontageChecklist([], TEMPLATES, false)).toBeUndefined()
  })

  it('returns undefined when the only instance belongs to a checklist outside the montaje-templates lookup (servicio/cierre/deactivated)', () => {
    const outOfScope = instancia({ id_checklist: 99 })
    expect(buildMontageChecklist([outOfScope], TEMPLATES, false)).toBeUndefined()
  })

  it('maps status to pending when completado is false, regardless of checklistOk', () => {
    const result = buildMontageChecklist(
      [instancia({ completado: false })],
      TEMPLATES,
      true,
    )
    expect(result?.status).toBe('pending')
  })

  it('maps status to completed when completado is true but checklistOk is false — never conflates completado with approval', () => {
    const result = buildMontageChecklist(
      [instancia({ completado: true })],
      TEMPLATES,
      false,
    )
    expect(result?.status).toBe('completed')
  })

  it('maps status to approved only when both completado and checklistOk (the participation-level flag) are true', () => {
    const result = buildMontageChecklist(
      [instancia({ completado: true })],
      TEMPLATES,
      true,
    )
    expect(result?.status).toBe('approved')
  })

  it('joins item descriptions/cantidadEsperada from the template, keyed by id_item', () => {
    const result = buildMontageChecklist([instancia()], TEMPLATES, false)
    expect(result?.items).toEqual([
      {
        idItem: 10,
        descripcion: 'Colocar mantelería',
        cantidadEsperada: 1,
        cantidad: 1,
        hecho: true,
      },
      {
        idItem: 11,
        descripcion: 'Acomodar sillas',
        cantidadEsperada: 8,
        cantidad: 3,
        hecho: false,
      },
    ])
  })

  it('falls back to an honest generic label for a respuesta whose id_item is not in the template (never fabricates a real description)', () => {
    const withUnknownItem = instancia({
      respuestas: [
        { id_respuesta: 1, id_instancia: 9001, id_item: 999, cantidad: 2, hecho: true },
      ],
    })
    const result = buildMontageChecklist([withUnknownItem], TEMPLATES, false)
    expect(result?.items).toEqual([
      {
        idItem: 999,
        descripcion: 'Ítem 999',
        cantidadEsperada: 2,
        cantidad: 2,
        hecho: true,
      },
    ])
  })
})

describe('approveChecklistInstancia', () => {
  it('PATCHes /checklist-instancias/{id}/aprobar with no request body', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: {
        instancia: {
          id_instancia: 9001,
          id_participacion: 5002,
          id_checklist: 1,
          completado: true,
          fecha: '2026-08-01T00:00:00',
          respuestas: [],
        },
        tipo: 'montaje',
        desbloquea_asignacion: true,
      },
    })

    await approveChecklistInstancia(9001)

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/checklist-instancias/9001/aprobar',
      method: 'PATCH',
    })
  })

  it('throws a SgebNetworkError if the envelope carries null data on success (defensive guard)', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: null,
    })

    const error = await approveChecklistInstancia(9001).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(SgebNetworkError)
  })
})
