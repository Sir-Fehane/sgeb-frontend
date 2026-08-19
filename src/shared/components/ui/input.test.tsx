import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { Input } from '@/shared/components/ui/input'

describe('Input — number-input wheel safety', () => {
  it('blurs a focused type="number" input on wheel scroll, instead of letting the browser step its value', () => {
    render(<Input type="number" defaultValue={200} aria-label="Tarifa" />)

    const input = screen.getByLabelText('Tarifa')
    input.focus()
    expect(input).toHaveFocus()

    input.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 100 }))

    expect(input).not.toHaveFocus()
  })

  it('does not blur on wheel for a non-number input (e.g. text/date) — only type="number" opts in', () => {
    render(<Input type="text" defaultValue="hello" aria-label="Título" />)

    const input = screen.getByLabelText('Título')
    input.focus()
    expect(input).toHaveFocus()

    input.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 100 }))

    expect(input).toHaveFocus()
  })

  it('never calls preventDefault on the wheel event — the page must keep scrolling normally', () => {
    render(<Input type="number" defaultValue={200} aria-label="Tarifa" />)

    const input = screen.getByLabelText('Tarifa')
    input.focus()
    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 100,
    })
    input.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
  })

  it('still calls a caller-supplied onWheel handler alongside the blur', () => {
    const onWheel = vi.fn()
    render(
      <Input type="number" defaultValue={200} aria-label="Tarifa" onWheel={onWheel} />,
    )

    const input = screen.getByLabelText('Tarifa')
    input.focus()
    input.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: 100 }))

    expect(onWheel).toHaveBeenCalledOnce()
  })

  it('leaves typing and keyboard step (arrow keys) completely unaffected', async () => {
    const user = userEvent.setup()
    render(<Input type="number" aria-label="Tarifa" />)

    const input = screen.getByLabelText('Tarifa')
    await user.click(input)
    await user.keyboard('200')

    expect(input).toHaveValue(200)
    expect(input).toHaveFocus()
  })
})
