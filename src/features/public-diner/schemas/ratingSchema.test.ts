import { describe, expect, it } from 'vitest'

import { ratingSchema } from '@/features/public-diner/schemas/ratingSchema'

describe('ratingSchema', () => {
  it('accepts a valid puntuacion with no comentario', () => {
    const result = ratingSchema.safeParse({ puntuacion: 5 })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({ puntuacion: 5, comentario: undefined })
    }
  })

  it('rejects a puntuacion below 1', () => {
    expect(ratingSchema.safeParse({ puntuacion: 0 }).success).toBe(false)
  })

  it('rejects a puntuacion above 5', () => {
    expect(ratingSchema.safeParse({ puntuacion: 6 }).success).toBe(false)
  })

  it('requires puntuacion', () => {
    expect(ratingSchema.safeParse({}).success).toBe(false)
  })

  it('accepts a comentario of exactly 255 characters', () => {
    const comentario = 'x'.repeat(255)
    const result = ratingSchema.safeParse({ puntuacion: 3, comentario })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.comentario).toBe(comentario)
    }
  })

  it('rejects a comentario longer than 255 characters', () => {
    const comentario = 'x'.repeat(256)
    expect(ratingSchema.safeParse({ puntuacion: 3, comentario }).success).toBe(false)
  })

  it('normalizes a blank comentario to undefined, never an empty string', () => {
    const result = ratingSchema.safeParse({ puntuacion: 4, comentario: '   ' })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.comentario).toBeUndefined()
    }
  })

  it('does not accept token_comensal as a schema field', () => {
    // token_comensal is not user input — the schema has no such key at all.
    expect(Object.keys(ratingSchema.shape)).toEqual(['puntuacion', 'comentario'])
  })
})
