import { fireEvent, render, screen } from '@testing-library/react'
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

describe('Input — numeric hardening (`numeric` prop)', () => {
  it('leaves a plain type="number" input (no `numeric` prop) unaffected — "1e3" really does become 1000, confirming the bug this hardens against', () => {
    render(<Input type="number" aria-label="Cantidad" />)

    fireEvent.change(screen.getByLabelText('Cantidad'), { target: { value: '1e3' } })

    expect(screen.getByLabelText('Cantidad')).toHaveValue(1000)
  })

  it('numeric="integer": "1e3" never becomes 1000 — the "e" is stripped, not interpreted as an exponent', () => {
    render(<Input type="number" numeric="integer" aria-label="Cupo de meseros" />)

    fireEvent.change(screen.getByLabelText('Cupo de meseros'), {
      target: { value: '1e3' },
    })

    expect(screen.getByLabelText('Cupo de meseros')).toHaveValue(13)
  })

  it('numeric="integer": "1E3" (uppercase) is rejected the same way', () => {
    render(<Input type="number" numeric="integer" aria-label="Cupo de meseros" />)

    fireEvent.change(screen.getByLabelText('Cupo de meseros'), {
      target: { value: '1E3' },
    })

    expect(screen.getByLabelText('Cupo de meseros')).toHaveValue(13)
  })

  it('numeric="integer": "+10" never produces a signed value', () => {
    // A bare leading "+" is rejected by the platform itself for
    // `type="number"` (not a valid HTML floating-point number — only a
    // leading "-" is), so a real `type="number"` input never even hands
    // our code a "+10" to sanitize. `type="text"` (still opting into
    // `numeric`, same as `EventGeofenceRadiusField` et al. only ever use
    // `type="number"`, but the sanitizer itself is type-agnostic) proves
    // OUR rule holds independent of that platform-level gate.
    render(<Input type="text" numeric="integer" aria-label="Cupo de meseros" />)

    fireEvent.change(screen.getByLabelText('Cupo de meseros'), {
      target: { value: '+10' },
    })

    expect(screen.getByLabelText('Cupo de meseros')).toHaveValue('10')
  })

  it('numeric="integer": "-10" never produces a negative value (negatives invalid here)', () => {
    render(<Input type="number" numeric="integer" aria-label="Cupo de meseros" />)

    fireEvent.change(screen.getByLabelText('Cupo de meseros'), {
      target: { value: '-10' },
    })

    expect(screen.getByLabelText('Cupo de meseros')).toHaveValue(10)
  })

  it('numeric="integer": a valid plain integer still works', async () => {
    const user = userEvent.setup()
    render(<Input type="number" numeric="integer" aria-label="Cupo de meseros" />)

    await user.type(screen.getByLabelText('Cupo de meseros'), '42')

    expect(screen.getByLabelText('Cupo de meseros')).toHaveValue(42)
  })

  it('numeric="integer": preserves the empty editing state (never coerces to 0)', async () => {
    const user = userEvent.setup()
    render(<Input type="number" numeric="integer" aria-label="Cupo de meseros" />)
    const input = screen.getByLabelText('Cupo de meseros')

    await user.type(input, '5')
    await user.clear(input)

    expect(input).toHaveValue(null)
  })

  it('numeric="decimal": "1e3" never becomes 1000 — the "e" is stripped, not interpreted as an exponent', () => {
    render(<Input type="number" numeric="decimal" aria-label="Tarifa" />)

    fireEvent.change(screen.getByLabelText('Tarifa'), { target: { value: '1e3' } })

    expect(screen.getByLabelText('Tarifa')).toHaveValue(13)
  })

  it('numeric="decimal": "1E3" (uppercase) is rejected the same way', () => {
    render(<Input type="number" numeric="decimal" aria-label="Tarifa" />)

    fireEvent.change(screen.getByLabelText('Tarifa'), { target: { value: '1E3' } })

    expect(screen.getByLabelText('Tarifa')).toHaveValue(13)
  })

  it('numeric="decimal": "+10" never produces a signed value', () => {
    // See the `numeric="integer"` "+10" test above for why this uses
    // `type="text"` — a real `type="number"` input already rejects a bare
    // leading "+" at the platform level before any JS runs.
    render(<Input type="text" numeric="decimal" aria-label="Tarifa" />)

    fireEvent.change(screen.getByLabelText('Tarifa'), { target: { value: '+10' } })

    expect(screen.getByLabelText('Tarifa')).toHaveValue('10')
  })

  it('numeric="decimal": "-10" is rejected by default (negatives invalid for money/volumes/rates)', () => {
    render(<Input type="number" numeric="decimal" aria-label="Tarifa" />)

    fireEvent.change(screen.getByLabelText('Tarifa'), { target: { value: '-10' } })

    expect(screen.getByLabelText('Tarifa')).toHaveValue(10)
  })

  it('numeric="decimal": a valid plain decimal still works', async () => {
    const user = userEvent.setup()
    render(<Input type="number" numeric="decimal" aria-label="Tarifa" />)

    await user.type(screen.getByLabelText('Tarifa'), '199.99')

    expect(screen.getByLabelText('Tarifa')).toHaveValue(199.99)
  })

  it('numeric="decimal" with allowNegative: keeps a leading "-" for signed fields (e.g. latitud)', async () => {
    const user = userEvent.setup()
    render(<Input type="number" numeric="decimal" allowNegative aria-label="Latitud" />)

    await user.type(screen.getByLabelText('Latitud'), '-19.43')

    expect(screen.getByLabelText('Latitud')).toHaveValue(-19.43)
  })

  it('numeric="decimal" without allowNegative rejects "-" even for the same shape of value', async () => {
    const user = userEvent.setup()
    render(<Input type="number" numeric="decimal" aria-label="Costo" />)

    await user.type(screen.getByLabelText('Costo'), '-19.43')

    expect(screen.getByLabelText('Costo')).toHaveValue(19.43)
  })

  it('sanitizes a pasted value, not just typed keystrokes — a paste delivers its whole string in one change event, exactly like this', () => {
    render(<Input type="number" numeric="integer" aria-label="Cupo de meseros" />)
    const input = screen.getByLabelText('Cupo de meseros')

    fireEvent.change(input, { target: { value: '1e3' } })

    expect(input).toHaveValue(13)
  })

  it('still calls a caller-supplied onChange, receiving the already-sanitized value', () => {
    const onChange = vi.fn()
    render(
      <Input type="number" numeric="integer" aria-label="Cupo" onChange={onChange} />,
    )

    fireEvent.change(screen.getByLabelText('Cupo'), { target: { value: '1e3' } })

    expect(onChange).toHaveBeenCalledOnce()
    const event = onChange.mock.calls[0]?.[0] as { target: { value: string } }
    expect(event.target.value).toBe('13')
  })
})
