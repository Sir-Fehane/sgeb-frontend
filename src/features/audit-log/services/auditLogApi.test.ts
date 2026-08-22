import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fetchAuditLog,
  toAuditLogListParams,
} from '@/features/audit-log/services/auditLogApi'
import { createDefaultAuditLogFilterState } from '@/features/audit-log/types/auditLog'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

function envelope(data: unknown) {
  return { result: { code: 'SGEB-0000', message: 'ok' }, data }
}

describe('toAuditLogListParams', () => {
  it('sends camelCase params — the real wire contract, not what OpenAPI documents in snake_case', () => {
    const filters = {
      fechaDesde: '2026-07-01',
      fechaHasta: '2026-07-31',
      tipoEntidad: 'USUARIO',
      accion: 'actualizar' as const,
      uuidResponsable: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    }

    expect(toAuditLogListParams(filters, 2, 20)).toEqual({
      fechaDesde: '2026-07-01',
      fechaHasta: '2026-07-31',
      tipoEntidad: 'USUARIO',
      accion: 'actualizar',
      uuidResponsable: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      page: 2,
      pageSize: 20,
    })
  })

  it('omits optional filters entirely when unset, never sends id_entidad (no such real param)', () => {
    const filters = createDefaultAuditLogFilterState(new Date('2026-08-21'))

    const params = toAuditLogListParams(filters, 1, 20)

    expect(params).not.toHaveProperty('tipoEntidad')
    expect(params).not.toHaveProperty('accion')
    expect(params).not.toHaveProperty('uuidResponsable')
    expect(params).not.toHaveProperty('id_entidad')
  })
})

describe('fetchAuditLog', () => {
  it('requests GET /admin/bitacora with the given params and maps the {items, meta} shape', async () => {
    vi.mocked(requestSgeb).mockResolvedValue(
      envelope({
        items: [
          {
            id_bitacora: 1,
            tipo_entidad: 'USUARIO',
            id_entidad: 42,
            accion: 'actualizar',
            uuid_usuario_responsable: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            detalle: 'estado borrador → confirmado',
            timestamp: '2026-08-20T10:00:00Z',
          },
        ],
        meta: { page: 1, page_size: 20, total: 1, last_page: 1 },
      }),
    )

    const result = await fetchAuditLog({
      fechaDesde: '2026-07-22',
      fechaHasta: '2026-08-21',
      page: 1,
      pageSize: 20,
    })

    expect(requestSgeb).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/admin/bitacora',
        params: {
          fechaDesde: '2026-07-22',
          fechaHasta: '2026-08-21',
          page: 1,
          pageSize: 20,
        },
      }),
    )
    expect(result.items).toEqual([
      {
        idBitacora: 1,
        tipoEntidad: 'USUARIO',
        idEntidad: 42,
        accion: 'actualizar',
        uuidUsuarioResponsable: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        detalle: 'estado borrador → confirmado',
        timestamp: '2026-08-20T10:00:00Z',
      },
    ])
    expect(result.meta).toEqual({ page: 1, pageSize: 20, total: 1, lastPage: 1 })
  })

  it('preserves a null uuid_usuario_responsable as null (system/automatic movement), not a missing value', async () => {
    vi.mocked(requestSgeb).mockResolvedValue(
      envelope({
        items: [
          {
            id_bitacora: 2,
            tipo_entidad: 'COMANDA_EVENTO',
            id_entidad: 7,
            accion: 'crear',
            uuid_usuario_responsable: null,
            detalle: 'Comanda generada automáticamente',
            timestamp: '2026-08-20T11:00:00Z',
          },
        ],
        meta: { page: 1, page_size: 20, total: 1, last_page: 1 },
      }),
    )

    const result = await fetchAuditLog({
      fechaDesde: '2026-07-22',
      fechaHasta: '2026-08-21',
    })

    expect(result.items[0]?.uuidUsuarioResponsable).toBeNull()
  })
})
