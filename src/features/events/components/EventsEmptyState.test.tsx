import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { EventsEmptyState } from '@/features/events/components/EventsEmptyState'

describe('EventsEmptyState', () => {
  it('renders without a create action when onCreate is not supplied', () => {
    render(<EventsEmptyState />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders a create action with a clear accessible name and invokes the callback', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn()
    render(<EventsEmptyState onCreate={onCreate} />)

    const button = screen.getByRole('button', { name: 'Crear el primer evento' })
    await user.click(button)

    expect(onCreate).toHaveBeenCalledOnce()
  })
})
