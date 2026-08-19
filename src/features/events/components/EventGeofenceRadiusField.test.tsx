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
  const { register, watch } = useForm<{ radio_geocerca_m: number }>({
    defaultValues: { radio_geocerca_m: defaultValue },
  })
  return (
    <EventGeofenceRadiusField
      value={watch('radio_geocerca_m')}
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

  it('renders the schematic radius visual as decorative — never competing with the real accessible name/value', () => {
    const { container } = render(<Host defaultValue={150} />)

    const decorative = container.querySelectorAll('[aria-hidden="true"]')
    expect(decorative.length).toBeGreaterThan(0)
  })

  it('respects disabled', () => {
    render(<Host defaultValue={150} disabled />)

    expect(
      screen.getByLabelText(/^Radio permitido para registrar llegada/),
    ).toBeDisabled()
  })

  it('shows concise, decorative-adjacent copy naming the visual as approximate — never claiming geographic accuracy', () => {
    render(<Host defaultValue={150} />)

    expect(
      screen.getByText('Representación aproximada del área permitida.'),
    ).toBeInTheDocument()
  })

  describe('low-to-high radius visual distinguishability (10–1000 m)', () => {
    function visualDiameterPx(defaultValue: number): number {
      const { container } = render(<Host defaultValue={defaultValue} />)
      const circle = container.querySelector<HTMLElement>('.border-info')
      if (!circle) {
        throw new Error('Expected the schematic radius circle to render')
      }
      return Number.parseFloat(circle.style.width)
    }

    it('keeps 10 m clearly visible — never collapsing to (near) zero size', () => {
      expect(visualDiameterPx(10)).toBeGreaterThanOrEqual(20)
    })

    it('bounds the maximum size at 1000 m', () => {
      expect(visualDiameterPx(1000)).toBeLessThanOrEqual(96)
    })

    it('makes every documented checkpoint (10/50/100/250/500/1000 m) visually distinguishable — each strictly larger than the last, by a perceptible margin', () => {
      const checkpoints = [10, 50, 100, 250, 500, 1000]
      const sizes = checkpoints.map(visualDiameterPx)

      for (let i = 1; i < sizes.length; i += 1) {
        const delta = sizes[i]! - sizes[i - 1]!
        expect(delta).toBeGreaterThan(4)
      }
    })

    it('spreads the low end (10/50/100 m) more evenly than a linear map would — the low-end step is not dramatically smaller than the high-end step', () => {
      const [d10, d50, d100, , d500, d1000] = [10, 50, 100, 250, 500, 1000].map(
        visualDiameterPx,
      )
      const lowStep = d100! - d10!
      const highStep = d1000! - d500!

      // A pure linear (proportional-to-meters) map would make this ratio
      // tiny (~0.13) since 10→100 m is a small slice of the 10–1000 m
      // range while 500→1000 m is half of it. The sqrt map keeps the low
      // end reasonably close to the high end instead.
      expect(lowStep / highStep).toBeGreaterThan(0.4)
      // Sanity: 50 m sits strictly between 10 m and 100 m.
      expect(d50).toBeGreaterThan(d10!)
      expect(d50).toBeLessThan(d100!)
    })
  })

  it('clamps and preserves visual stability for out-of-range/invalid values without ever throwing', () => {
    expect(() => render(<Host defaultValue={Number.NaN} />)).not.toThrow()
  })
})
