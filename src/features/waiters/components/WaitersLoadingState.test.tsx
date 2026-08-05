import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { WaitersLoadingState } from '@/features/waiters/components/WaitersLoadingState'

describe('WaitersLoadingState', () => {
  it('exposes a single accessible loading status', () => {
    render(<WaitersLoadingState />)

    expect(screen.getByRole('status', { name: 'Cargando meseros' })).toBeInTheDocument()
  })
})
