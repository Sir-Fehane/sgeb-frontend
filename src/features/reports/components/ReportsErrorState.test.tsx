import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ReportsErrorState } from '@/features/reports/components/ReportsErrorState'

describe('ReportsErrorState', () => {
  it('renders the error message with an assertive live region', () => {
    render(<ReportsErrorState errorMessage="No pudimos completar la solicitud." />)

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No pudimos completar la solicitud.',
    )
  })

  it('invokes onRetry when the retry action is activated', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()
    render(<ReportsErrorState errorMessage="Error." onRetry={onRetry} />)

    await user.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('renders no retry action when onRetry is not supplied', () => {
    render(<ReportsErrorState errorMessage="Error." />)

    expect(screen.queryByRole('button', { name: 'Reintentar' })).not.toBeInTheDocument()
  })
})
