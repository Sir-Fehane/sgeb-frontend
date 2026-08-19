import { fireEvent, render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'

import { EventTimeField } from '@/features/events/components/EventTimeField'

function Host({ disabled, error }: { disabled?: boolean; error?: string }) {
  const { register } = useForm<{ hora_inicio: string }>({
    defaultValues: { hora_inicio: '' },
  })
  return (
    <EventTimeField
      label="Hora de inicio del evento"
      disabled={disabled}
      error={error}
      registration={register('hora_inicio')}
    />
  )
}

describe('EventTimeField', () => {
  it('renders a native input[type="time"] — no custom picker, no popover', () => {
    render(<Host />)

    const input = screen.getByLabelText(/^Hora de inicio del evento/)
    expect(input.tagName).toBe('INPUT')
    expect(input).toHaveAttribute('type', 'time')
  })

  it('accepts an HH:MM value like any native time input', () => {
    render(<Host />)

    const input = screen.getByLabelText<HTMLInputElement>(/^Hora de inicio del evento/)
    fireEvent.change(input, { target: { value: '18:30' } })

    expect(input).toHaveValue('18:30')
  })

  it('is keyboard-focusable — the browser handles the native time widget itself', () => {
    render(<Host />)

    const input = screen.getByLabelText<HTMLInputElement>(/^Hora de inicio del evento/)
    input.focus()

    expect(input).toHaveFocus()
  })

  it('respects disabled', () => {
    render(<Host disabled />)

    expect(screen.getByLabelText(/^Hora de inicio del evento/)).toBeDisabled()
  })

  it('surfaces the given error', () => {
    render(<Host error="Ingresa una hora válida." />)

    expect(screen.getByText('Ingresa una hora válida.')).toBeInTheDocument()
  })

  it('renders exactly one accessible clock affordance (icon), decorative only — never a second interactive control', () => {
    const { container } = render(<Host />)

    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    const icon = container.querySelector('svg[aria-hidden="true"]')
    expect(icon).not.toBeNull()
  })

  it('never renders a second date input alongside the time input', () => {
    render(<Host />)

    expect(document.querySelector('input[type="date"]')).toBeNull()
    expect(document.querySelector('input[type="datetime-local"]')).toBeNull()
  })
})
