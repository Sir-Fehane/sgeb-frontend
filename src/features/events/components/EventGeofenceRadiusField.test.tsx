import { render, screen } from '@testing-library/react'
import { useForm } from 'react-hook-form'
import { describe, expect, it } from 'vitest'

import { EventGeofenceRadiusField } from '@/features/events/components/EventGeofenceRadiusField'

/** `EventGeofenceRadiusField` needs a real RHF `register` return value — a thin host renders one. */
function Host({
  defaultValue,
  disabled,
  error,
  extraDescription,
}: {
  defaultValue: number
  disabled?: boolean
  error?: string
  extraDescription?: string
}) {
  const { register } = useForm<{ radio_geocerca_m: number }>({
    defaultValues: { radio_geocerca_m: defaultValue },
  })
  return (
    <EventGeofenceRadiusField
      disabled={disabled}
      error={error}
      extraDescription={extraDescription}
      registration={register('radio_geocerca_m', { valueAsNumber: true })}
    />
  )
}

describe('EventGeofenceRadiusField', () => {
  it('labels the field in real-world arrival-radius terms, not as a bare DTO property name', () => {
    render(<Host defaultValue={150} />)

    expect(
      screen.getByLabelText(/^Radio permitido para registrar llegada/),
    ).toBeInTheDocument()
  })

  it('preserves the existing numeric value unchanged, and never invents a default', () => {
    render(<Host defaultValue={150} />)

    expect(screen.getByLabelText(/^Radio permitido para registrar llegada/)).toHaveValue(
      150,
    )
  })

  it('shows the base helper copy explaining the real-world meaning of the field', () => {
    render(<Host defaultValue={150} />)

    expect(
      screen.getByText(
        'El personal debe estar dentro de esta distancia del salón para poder registrar su llegada.',
      ),
    ).toBeInTheDocument()
  })

  it('appends extraDescription after the base helper copy, without replacing it', () => {
    render(<Host defaultValue={150} extraDescription="Solo editable en borrador." />)

    expect(
      screen.getByText(
        'El personal debe estar dentro de esta distancia del salón para poder registrar su llegada. Solo editable en borrador.',
      ),
    ).toBeInTheDocument()
  })

  it('shows the error instead of the helper description when one is given', () => {
    render(<Host defaultValue={150} error="El radio debe ser al menos 10 m." />)

    expect(screen.getByText('El radio debe ser al menos 10 m.')).toBeInTheDocument()
    expect(
      screen.queryByText(
        'El personal debe estar dentro de esta distancia del salón para poder registrar su llegada.',
      ),
    ).not.toBeInTheDocument()
  })

  it('renders an "m" unit suffix alongside the numeric input', () => {
    render(<Host defaultValue={150} />)

    expect(screen.getByText('m')).toBeInTheDocument()
  })

  it('respects disabled', () => {
    render(<Host defaultValue={150} disabled />)

    expect(
      screen.getByLabelText(/^Radio permitido para registrar llegada/),
    ).toBeDisabled()
  })

  it('renders no schematic circle visual — EventGeofenceMapPreview is now the sole visualization, never a competing second one', () => {
    render(<Host defaultValue={150} />)

    expect(
      screen.queryByText('Representación aproximada del área permitida.'),
    ).not.toBeInTheDocument()
  })

  it('never throws for an out-of-range/invalid value — clamping/validation stays the form schema’s job', () => {
    expect(() => render(<Host defaultValue={Number.NaN} />)).not.toThrow()
  })

  it('exposes the documented 10-1000 m range as native min/max attributes', () => {
    render(<Host defaultValue={150} />)

    const input = screen.getByLabelText(/^Radio permitido para registrar llegada/)
    expect(input).toHaveAttribute('min', '10')
    expect(input).toHaveAttribute('max', '1000')
  })

  it('never auto-corrects an out-of-range typed value — min/max are hints, not clamps', () => {
    render(<Host defaultValue={9} />)

    // 9 is below the documented minimum but the input still shows it
    // verbatim — the native min attribute alone never rewrites a typed
    // value; only Zod (via `error`) decides validity.
    expect(screen.getByLabelText(/^Radio permitido para registrar llegada/)).toHaveValue(
      9,
    )
  })
})
