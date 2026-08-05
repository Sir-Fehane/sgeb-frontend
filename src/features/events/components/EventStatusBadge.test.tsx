import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { EventStatusBadge } from '@/features/events/components/EventStatusBadge'
import type { EventStatus } from '@/features/events/types/event'

const CASES: [EventStatus, string][] = [
  ['borrador', 'Borrador'],
  ['publicado', 'Publicado'],
  ['en_curso', 'En curso'],
  ['finalizado', 'Finalizado'],
  ['cancelado', 'Cancelado'],
]

describe('EventStatusBadge', () => {
  it.each(CASES)('renders %s as the text "%s" — never color alone', (estado, label) => {
    render(<EventStatusBadge estado={estado} />)

    expect(screen.getByText(label)).toBeInTheDocument()
  })
})
