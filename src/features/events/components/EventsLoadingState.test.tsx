import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { EventsLoadingState } from '@/features/events/components/EventsLoadingState'

describe('EventsLoadingState', () => {
  it('exposes a single accessible loading status', () => {
    render(<EventsLoadingState />)

    expect(screen.getByRole('status', { name: 'Cargando eventos' })).toBeInTheDocument()
  })
})
