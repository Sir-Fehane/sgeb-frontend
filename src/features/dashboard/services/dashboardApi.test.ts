import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fetchCaptainDashboard,
  type DashboardCapitanApiRecord,
} from '@/features/dashboard/services/dashboardApi'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

const EVENTO_EN_CURSO = {
  id_evento: 1,
  id_salon: 3,
  titulo: 'Boda García',
  tipo: 'social' as const,
  fecha: '2026-09-12',
  hora_presentacion: '16:00',
  inicio: '2026-09-12T18:00:00',
  fin: null,
  cupo_meseros: 12,
  num_mesas: 20,
  tarifa_por_mesero: 450,
  estado: 'en_curso' as const,
  salon: { nombre: 'Salón Roble' },
}

const EVENTO_POR_CERRAR = {
  id_evento: 2,
  id_salon: 4,
  titulo: 'Conferencia anual',
  tipo: 'empresarial' as const,
  fecha: '2026-08-01',
  hora_presentacion: '08:00',
  inicio: '2026-08-01T08:00:00',
  fin: '2026-08-01T20:00:00',
  cupo_meseros: 8,
  num_mesas: 10,
  tarifa_por_mesero: 400,
  estado: 'finalizado' as const,
  // No `salon` — `DashboardService.capitan`'s `por_cerrar` query never
  // preloads it (see `services/dashboardApi.ts`'s own comment).
}

const RECORD: DashboardCapitanApiRecord = {
  en_curso: [EVENTO_EN_CURSO],
  proximos: [],
  borradores: 2,
  por_cerrar: [EVENTO_POR_CERRAR],
  totales: { en_curso: 1, proximos: 0, por_cerrar: 1 },
}

function envelope(data: DashboardCapitanApiRecord) {
  return { result: { code: 'SGEB-0000', message: 'ok' }, data }
}

describe('fetchCaptainDashboard', () => {
  it('requests GET /dashboard/capitan with no query parameters', async () => {
    vi.mocked(requestSgeb).mockResolvedValue(envelope(RECORD))

    await fetchCaptainDashboard()

    expect(requestSgeb).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/dashboard/capitan' }),
    )
    const config = vi.mocked(requestSgeb).mock.calls[0]![0] as { params?: unknown }
    expect(config.params).toBeUndefined()
  })

  it('maps the real 5-field response shape exactly — no invented sections', async () => {
    vi.mocked(requestSgeb).mockResolvedValue(envelope(RECORD))

    const result = await fetchCaptainDashboard()

    expect(result).toEqual({
      enCurso: [
        {
          idEvento: 1,
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
          estado: 'en_curso',
          salonNombre: 'Salón Roble',
        },
      ],
      proximos: [],
      borradores: 2,
      porCerrar: [
        {
          idEvento: 2,
          idSalon: 4,
          titulo: 'Conferencia anual',
          tipo: 'empresarial',
          fecha: '2026-08-01',
          horaPresentacion: '08:00',
          inicio: '2026-08-01T08:00:00',
          fin: '2026-08-01T20:00:00',
          cupoMeseros: 8,
          numMesas: 10,
          tarifaPorMesero: 400,
          estado: 'finalizado',
        },
      ],
      totales: { enCurso: 1, proximos: 0, porCerrar: 1 },
    })
  })

  it('never populates salonNombre for a por_cerrar row — the real endpoint never preloads that relation for it', async () => {
    vi.mocked(requestSgeb).mockResolvedValue(envelope(RECORD))

    const result = await fetchCaptainDashboard()

    expect(result.porCerrar[0]?.salonNombre).toBeUndefined()
  })
})
