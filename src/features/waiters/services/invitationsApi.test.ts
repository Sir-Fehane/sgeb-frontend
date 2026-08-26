import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createInvitation,
  fetchInvitations,
  resendInvitation,
  revokeInvitation,
  type InvitacionApiRecord,
} from '@/features/waiters/services/invitationsApi'
import { requestSgeb } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
})

const RECORD: InvitacionApiRecord = {
  id_invitacion: 10,
  id_rol_destino: 3,
  nombre: 'Pedro',
  apellido_paterno: 'Gómez',
  apellido_materno: null,
  correo: 'pedro.gomez@example.com',
  estado: 'pendiente',
  expira_en: '2026-08-08T09:00:00',
  id_usuario_creado: null,
  usada_en: null,
  creado_en: '2026-08-05T09:00:00',
}

function envelope<T>(data: T) {
  return { result: { code: 'SGEB-0000', message: 'ok' }, data }
}

describe('fetchInvitations', () => {
  it('maps the real Invitacion wire record, including the server-derived expirada estado', async () => {
    vi.mocked(requestSgeb).mockResolvedValue(
      envelope([{ ...RECORD, estado: 'expirada' as const }]),
    )

    const result = await fetchInvitations({})

    expect(result).toEqual([
      {
        idInvitacion: 10,
        nombreCompleto: 'Pedro Gómez',
        correo: 'pedro.gomez@example.com',
        estado: 'expirada',
        expiraEn: '2026-08-08T09:00:00',
        creadoEn: '2026-08-05T09:00:00',
      },
    ])
  })

  it('never sends mias — the backend auto-scopes capitán sessions and admin sees all by default', async () => {
    vi.mocked(requestSgeb).mockResolvedValue(envelope([RECORD]))

    await fetchInvitations({})

    const config = vi.mocked(requestSgeb).mock.calls[0]![0] as {
      params?: Record<string, unknown>
    }
    expect(config.params).not.toHaveProperty('mias')
  })
})

describe('createInvitation', () => {
  it('POSTs to /usuarios/invitaciones with the exact request body and maps the one-time deeplink response', async () => {
    vi.mocked(requestSgeb).mockResolvedValue(
      envelope({
        correo: 'pedro.gomez@example.com',
        deeplink: 'mx.mediocres.sgeb://registro?token=abc',
        expira_en: '2026-08-08T09:00:00',
      }),
    )

    const result = await createInvitation({
      idRolDestino: 3,
      nombre: 'Pedro',
      apellidoPaterno: 'Gómez',
      correo: 'pedro.gomez@example.com',
    })

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/usuarios/invitaciones',
      method: 'POST',
      data: {
        idRolDestino: 3,
        nombre: 'Pedro',
        apellidoPaterno: 'Gómez',
        correo: 'pedro.gomez@example.com',
      },
    })
    expect(result).toEqual({
      correo: 'pedro.gomez@example.com',
      deeplink: 'mx.mediocres.sgeb://registro?token=abc',
      expiraEn: '2026-08-08T09:00:00',
    })
  })

  it("never sends a telefono field — confirmed against the pinned backend's crearValidator (invitaciones_controller.ts), which has no phone field at all; a phone number can only be set later, after the invited person's account exists, via PUT /usuarios/{uuid} or PUT /usuarios/me", async () => {
    vi.mocked(requestSgeb).mockResolvedValue(
      envelope({
        correo: 'pedro.gomez@example.com',
        deeplink: 'mx.mediocres.sgeb://registro?token=abc',
        expira_en: '2026-08-08T09:00:00',
      }),
    )

    await createInvitation({
      idRolDestino: 3,
      nombre: 'Pedro',
      apellidoPaterno: 'Gómez',
      correo: 'pedro.gomez@example.com',
    })

    const sentData = vi.mocked(requestSgeb).mock.calls[0]![0].data as Record<
      string,
      unknown
    >
    expect(sentData).not.toHaveProperty('telefono')
  })
})

describe('revokeInvitation', () => {
  it('DELETEs /usuarios/invitaciones/{id}', async () => {
    vi.mocked(requestSgeb).mockResolvedValue(
      envelope({ ...RECORD, estado: 'revocada' as const }),
    )

    const result = await revokeInvitation(10)

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/usuarios/invitaciones/10',
      method: 'DELETE',
    })
    expect(result.estado).toBe('revocada')
  })
})

describe('resendInvitation', () => {
  it('POSTs /usuarios/invitaciones/{id}/reenviar and maps a response with no correo field', async () => {
    vi.mocked(requestSgeb).mockResolvedValue(
      envelope({
        deeplink: 'mx.mediocres.sgeb://registro?token=xyz',
        expira_en: '2026-08-11T09:00:00',
      }),
    )

    const result = await resendInvitation(10)

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/usuarios/invitaciones/10/reenviar',
      method: 'POST',
    })
    expect(result).toEqual({
      deeplink: 'mx.mediocres.sgeb://registro?token=xyz',
      expiraEn: '2026-08-11T09:00:00',
    })
  })
})
