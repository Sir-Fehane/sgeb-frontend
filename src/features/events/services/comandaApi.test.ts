import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  fetchComandaAccess,
  fetchComandaFile,
  fetchComandaMetadata,
  isComandaNotFoundError,
  retireComanda,
  uploadOrReplaceComanda,
  type ComandaApiRecord,
} from '@/features/events/services/comandaApi'
import { SgebApplicationError, SgebNetworkError } from '@/shared/api/sgebApiError'
import { requestSgeb, requestSgebBinary } from '@/shared/api/sgebClient'

vi.mock('@/shared/api/sgebClient', () => ({
  requestSgeb: vi.fn(),
  requestSgebBinary: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(requestSgeb).mockReset()
  vi.mocked(requestSgebBinary).mockReset()
})

const RECORD: ComandaApiRecord = {
  id_comanda: 7,
  id_evento: 1001,
  nombre_original: 'XV de María.pdf',
  tipo_mime: 'application/pdf',
  tamano_bytes: 512_000,
  activo: true,
  creado_en: '2026-09-01T10:00:00Z',
  url: 'https://storage.sgeb.mx/comandas/1001/3f2a9c14.pdf?X-Amz-Signature=abc',
  expira_en: '2026-09-01T10:15:00Z',
}

describe('fetchComandaMetadata', () => {
  it('requests GET /eventos/{id}/comanda and maps only the stable fields', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: RECORD,
    })
    const controller = new AbortController()

    const result = await fetchComandaMetadata(1001, controller.signal)

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/eventos/1001/comanda',
      signal: controller.signal,
    })
    expect(result).toEqual({
      idComanda: 7,
      nombreOriginal: 'XV de María.pdf',
      tipoMime: 'application/pdf',
      tamanoBytes: 512_000,
      activo: true,
      creadoEn: '2026-09-01T10:00:00Z',
    })
  })

  it('never includes url or expira_en in the mapped/cached view model', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: RECORD,
    })

    const result = await fetchComandaMetadata(1001)

    expect(result).not.toHaveProperty('url')
    expect(result).not.toHaveProperty('expiraEn')
    expect(result).not.toHaveProperty('expira_en')
  })

  it('resolves to null when data is null (defensive — the real "no comanda" case is SGEB-3001, not null data)', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: null,
    })

    expect(await fetchComandaMetadata(1001)).toBeNull()
  })
})

describe('fetchComandaAccess', () => {
  it('requests the SAME endpoint fresh and maps only url/expiraEn', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: RECORD,
    })

    const result = await fetchComandaAccess(1001)

    expect(requestSgeb).toHaveBeenCalledWith({ url: '/eventos/1001/comanda' })
    expect(result).toEqual({
      url: 'https://storage.sgeb.mx/comandas/1001/3f2a9c14.pdf?X-Amz-Signature=abc',
      expiraEn: '2026-09-01T10:15:00Z',
    })
  })

  it('returns null url/expiraEn for the local/dev placeholder response shape', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: { ...RECORD, url: 'local://comandas/1001/3f2a9c14.pdf', expira_en: null },
    })

    const result = await fetchComandaAccess(1001)

    expect(result.url).toBe('local://comandas/1001/3f2a9c14.pdf')
  })

  it("never reads or forwards Evento.comanda_url — only the Comanda record's own url field", async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: RECORD,
    })

    await fetchComandaAccess(1001)

    const calledConfig = vi.mocked(requestSgeb).mock.calls[0]![0]
    expect(calledConfig.url).toBe('/eventos/1001/comanda')
    expect(calledConfig.url).not.toContain('eventos/1001"')
  })
})

describe('isComandaNotFoundError', () => {
  it('is true only for SGEB-3001', () => {
    expect(
      isComandaNotFoundError(
        new SgebApplicationError(404, { code: 'SGEB-3001', message: 'No encontrado.' }),
      ),
    ).toBe(true)
  })

  it('is false for any other SgebApplicationError code', () => {
    expect(
      isComandaNotFoundError(
        new SgebApplicationError(403, { code: 'SGEB-1004', message: 'Sin permiso.' }),
      ),
    ).toBe(false)
  })

  it('is false for a DIFFERENT business code that happens to share the same HTTP 404 status — checks result.code, never the HTTP status', () => {
    // docs/errors/Diccionario_Errores_SGEB.md is explicit that the
    // business code and the HTTP status are independent axes (the same
    // code can travel over different statuses, and different codes can
    // share a status) — e.g. SGEB-3004 ("ya no está disponible", a
    // deactivated resource) is also HTTP 404 but means something
    // different from "no comanda has ever been uploaded" (SGEB-3001).
    expect(
      isComandaNotFoundError(
        new SgebApplicationError(404, {
          code: 'SGEB-3004',
          message: 'Este recurso ya no está disponible.',
        }),
      ),
    ).toBe(false)
  })

  it('is false for a SgebNetworkError and non-SGEB values', () => {
    expect(isComandaNotFoundError(new SgebNetworkError('Sin conexión.'))).toBe(false)
    expect(isComandaNotFoundError(undefined)).toBe(false)
  })
})

describe('uploadOrReplaceComanda', () => {
  it('POSTs multipart/form-data with the FormData key exactly "comanda", preserving the File', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'creado' },
      data: RECORD,
    })
    const file = new File(['%PDF-1.4'], 'comanda.pdf', { type: 'application/pdf' })

    const result = await uploadOrReplaceComanda(1001, file)

    expect(requestSgeb).toHaveBeenCalledOnce()
    const calledConfig = vi.mocked(requestSgeb).mock.calls[0]![0]
    expect(calledConfig.url).toBe('/eventos/1001/comanda')
    expect(calledConfig.method).toBe('POST')
    expect(calledConfig.data).toBeInstanceOf(FormData)
    const formData = calledConfig.data as FormData
    expect(formData.get('comanda')).toBe(file)
    // Exactly one field — no other value is ever sent.
    expect(Array.from(formData.keys())).toEqual(['comanda'])
    expect(result.idComanda).toBe(7)
  })

  it('never sets a Content-Type header manually', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'creado' },
      data: RECORD,
    })

    await uploadOrReplaceComanda(
      1001,
      new File(['x'], 'a.pdf', { type: 'application/pdf' }),
    )

    const calledConfig = vi.mocked(requestSgeb).mock.calls[0]![0]
    expect(calledConfig).not.toHaveProperty('headers')
  })

  it('throws a SgebNetworkError if the envelope carries null data on success (defensive guard)', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0001', message: 'creado' },
      data: null,
    })

    const error = await uploadOrReplaceComanda(
      1001,
      new File(['x'], 'a.pdf', { type: 'application/pdf' }),
    ).catch((e: unknown) => e)

    expect(error).toBeInstanceOf(SgebNetworkError)
  })

  it('propagates a SgebApplicationError (e.g. SGEB-2004 bad MIME) unchanged', async () => {
    const error = new SgebApplicationError(400, {
      code: 'SGEB-2004',
      message: 'El valor seleccionado no es válido.',
    })
    vi.mocked(requestSgeb).mockRejectedValue(error)

    await expect(
      uploadOrReplaceComanda(1001, new File(['x'], 'a.zip', { type: 'application/zip' })),
    ).rejects.toBe(error)
  })
})

describe('retireComanda', () => {
  it('DELETEs the exact endpoint', async () => {
    vi.mocked(requestSgeb).mockResolvedValue({
      result: { code: 'SGEB-0000', message: 'ok' },
      data: null,
    })

    await retireComanda(1001)

    expect(requestSgeb).toHaveBeenCalledWith({
      url: '/eventos/1001/comanda',
      method: 'DELETE',
    })
  })
})

describe('fetchComandaFile', () => {
  it('requests GET /eventos/{id}/comanda/archivo through requestSgebBinary and returns the Blob', async () => {
    const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' })
    vi.mocked(requestSgebBinary).mockResolvedValue(blob)
    const controller = new AbortController()

    const result = await fetchComandaFile(1001, controller.signal)

    expect(requestSgebBinary).toHaveBeenCalledWith({
      url: '/eventos/1001/comanda/archivo',
      signal: controller.signal,
    })
    expect(result).toBe(blob)
  })
})
