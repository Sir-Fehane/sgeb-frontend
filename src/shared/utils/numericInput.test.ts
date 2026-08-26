import { describe, expect, it } from 'vitest'

import {
  sanitizeDecimalInputValue,
  sanitizeIntegerInputValue,
} from '@/shared/utils/numericInput'

describe('sanitizeIntegerInputValue', () => {
  it('keeps plain digits unchanged', () => {
    expect(sanitizeIntegerInputValue('1234')).toBe('1234')
  })

  it('preserves empty input while editing', () => {
    expect(sanitizeIntegerInputValue('')).toBe('')
  })

  it('strips scientific notation markers', () => {
    expect(sanitizeIntegerInputValue('1e3')).toBe('13')
    expect(sanitizeIntegerInputValue('1E3')).toBe('13')
  })

  it('strips an explicit sign', () => {
    expect(sanitizeIntegerInputValue('+10')).toBe('10')
    expect(sanitizeIntegerInputValue('-10')).toBe('10')
  })

  it('strips a decimal separator (dot or comma)', () => {
    expect(sanitizeIntegerInputValue('1.5')).toBe('15')
    expect(sanitizeIntegerInputValue('1,5')).toBe('15')
  })

  it('strips arbitrary pasted non-digit characters', () => {
    expect(sanitizeIntegerInputValue('a1b2c3')).toBe('123')
  })
})

describe('sanitizeDecimalInputValue', () => {
  it('keeps a plain decimal unchanged', () => {
    expect(sanitizeDecimalInputValue('123.45')).toBe('123.45')
  })

  it('preserves empty input while editing', () => {
    expect(sanitizeDecimalInputValue('')).toBe('')
  })

  it('strips scientific notation markers', () => {
    expect(sanitizeDecimalInputValue('1e3')).toBe('13')
    expect(sanitizeDecimalInputValue('1E3')).toBe('13')
  })

  it('strips an explicit "+" unconditionally', () => {
    expect(sanitizeDecimalInputValue('+10')).toBe('10')
  })

  it('strips "-" by default (negatives invalid for this field)', () => {
    expect(sanitizeDecimalInputValue('-10')).toBe('10')
  })

  it('keeps a leading "-" when allowNegative is set', () => {
    expect(sanitizeDecimalInputValue('-10.5', { allowNegative: true })).toBe('-10.5')
  })

  it('collapses a mid-value "-" to a single leading sign when allowNegative is set', () => {
    expect(sanitizeDecimalInputValue('1-0', { allowNegative: true })).toBe('10')
    expect(sanitizeDecimalInputValue('--10', { allowNegative: true })).toBe('-10')
  })

  it('collapses multiple decimal separators to a single one', () => {
    expect(sanitizeDecimalInputValue('1.2.3')).toBe('1.23')
  })

  it('never invents a precision rule — a value with 5 decimals passes through unchanged', () => {
    expect(sanitizeDecimalInputValue('1.23456')).toBe('1.23456')
  })
})
