import { describe, expect, it } from 'vitest'

import {
  formatComandaFileSize,
  formatComandaMimeType,
} from '@/features/events/utils/comandaFormatting'

describe('formatComandaMimeType', () => {
  it('maps each documented MIME type to its friendly label', () => {
    expect(formatComandaMimeType('application/pdf')).toBe('PDF')
    expect(formatComandaMimeType('image/jpeg')).toBe('JPEG')
    expect(formatComandaMimeType('image/png')).toBe('PNG')
    expect(formatComandaMimeType('image/heic')).toBe('HEIC')
    expect(formatComandaMimeType('image/webp')).toBe('WebP')
  })

  it('falls back to the raw value for an unrecognized MIME type', () => {
    expect(formatComandaMimeType('application/zip')).toBe('application/zip')
  })
})

describe('formatComandaFileSize', () => {
  it('formats sub-megabyte sizes in KB', () => {
    expect(formatComandaFileSize(512_000)).toBe('500 KB')
  })

  it('formats megabyte-and-above sizes in MB with two decimals', () => {
    expect(formatComandaFileSize(3 * 1024 * 1024)).toBe('3.00 MB')
  })
})
