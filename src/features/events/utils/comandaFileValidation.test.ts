import { describe, expect, it } from 'vitest'

import {
  MAX_COMANDA_FILE_SIZE_BYTES,
  validateComandaFile,
} from '@/features/events/utils/comandaFileValidation'

function makeFile(sizeBytes: number, type: string, name = 'comanda.pdf'): File {
  return new File([new Uint8Array(sizeBytes)], name, { type })
}

describe('validateComandaFile', () => {
  it('accepts a PDF within the size limit', () => {
    expect(validateComandaFile(makeFile(1024, 'application/pdf'))).toBeNull()
  })

  it.each(['image/jpeg', 'image/png', 'image/heic', 'image/webp'])(
    'accepts %s within the size limit',
    (type) => {
      expect(validateComandaFile(makeFile(1024, type, 'comanda.img'))).toBeNull()
    },
  )

  it('rejects an unsupported MIME type', () => {
    expect(validateComandaFile(makeFile(1024, 'application/zip', 'comanda.zip'))).toMatch(
      /Formato no permitido/,
    )
  })

  it('rejects a file over the 10 MB cap', () => {
    expect(
      validateComandaFile(makeFile(MAX_COMANDA_FILE_SIZE_BYTES + 1, 'application/pdf')),
    ).toMatch(/10 MB/)
  })

  it('accepts a file exactly at the 10 MB cap', () => {
    expect(
      validateComandaFile(makeFile(MAX_COMANDA_FILE_SIZE_BYTES, 'application/pdf')),
    ).toBeNull()
  })
})
