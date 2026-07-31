import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { WaitersErrorState } from '@/features/waiters/components/WaitersErrorState'

describe('WaitersErrorState', () => {
  it('renders the error message with an assertive live region', () => {
    render(<WaitersErrorState errorMessage="Ocurrió un problema inesperado." />)

    expect(screen.getByRole('alert')).toHaveTextContent('Ocurrió un problema inesperado.')
  })

  it('invokes onRetry when the retry action is activated', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(<WaitersErrorState errorMessage="Error." onRetry={onRetry} />)

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(onRetry).toHaveBeenCalledOnce()
  })
})
