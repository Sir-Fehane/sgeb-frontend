import { IconMapPin } from '@tabler/icons-react'
import type { UseFormRegisterReturn } from 'react-hook-form'

import { Caption, FormField, Input } from '@/shared/components'

export interface EventGeofenceRadiusFieldProps {
  /** The field's current (possibly `NaN`, while empty) numeric value — only used to size the visual. */
  value: number
  disabled?: boolean | undefined
  error?: string | undefined
  /**
   * Extra copy appended after the base helper sentence, e.g.
   * `EventEditForm`'s "solo editable en borrador" restriction. The base
   * sentence always renders; this never replaces it.
   */
  extraDescription?: string | undefined
  /** `register('radio_geocerca_m', { valueAsNumber: true })` — spread directly onto the `<input>`. */
  registration: UseFormRegisterReturn
}

const RADIO_GEOCERCA_MIN = 10
const RADIO_GEOCERCA_MAX = 1000

const VISUAL_BOX_PX = 104
const VISUAL_MIN_PX = 22
const VISUAL_MAX_PX = 96

const SQRT_RADIO_MIN = Math.sqrt(RADIO_GEOCERCA_MIN)
const SQRT_RADIO_MAX = Math.sqrt(RADIO_GEOCERCA_MAX)

const BASE_HELPER_TEXT =
  'El personal debe estar dentro de esta distancia del salón para poder registrar su llegada.'

/**
 * Square-root map from the 10–1000 m documented range onto a small
 * illustrative circle — never a real distance/map scale, and never fed
 * back into the submitted value (only `diameter` below reads this; the
 * `<input>` itself always carries the exact `radioGeocercaM` the user
 * typed).
 *
 * A LINEAR map over this 100x range visually flattens the low end: 10,
 * 50, and 100 m land within a few px of each other while 500–1000 m
 * dominates the whole visible spread. Mapping on `sqrt(meters)` instead
 * (area-like scaling, the same intuition as a linear-radius circle's
 * *area* growing with the square) spreads the low/mid checkpoints out
 * evenly while still bounding the maximum size — see
 * `EventGeofenceRadiusField.test.tsx` for the exact px deltas asserted
 * across 10/50/100/250/500/1000 m.
 */
function radiusToVisualDiameter(meters: number): number {
  if (!Number.isFinite(meters)) {
    return VISUAL_MIN_PX
  }
  const clamped = Math.min(Math.max(meters, RADIO_GEOCERCA_MIN), RADIO_GEOCERCA_MAX)
  const ratio = (Math.sqrt(clamped) - SQRT_RADIO_MIN) / (SQRT_RADIO_MAX - SQRT_RADIO_MIN)
  return VISUAL_MIN_PX + ratio * (VISUAL_MAX_PX - VISUAL_MIN_PX)
}

/**
 * Presents `radioGeocercaM` as a real-world "arrival radius" rather than a
 * bare DTO number — same backend contract and 10–1000 m range as before
 * (`createEventFormSchema`/`editEventFormSchema`), just with helper copy
 * explaining what the number means and a small, explicitly schematic
 * (never cartographic) circle that scales with the current value. No map
 * dependency, no salón coordinates plotted — see this branch's report for
 * why a real map is deliberately out of scope here.
 */
export function EventGeofenceRadiusField({
  value,
  disabled,
  error,
  extraDescription,
  registration,
}: EventGeofenceRadiusFieldProps) {
  const diameter = radiusToVisualDiameter(value)
  const description = extraDescription
    ? `${BASE_HELPER_TEXT} ${extraDescription}`
    : BASE_HELPER_TEXT

  return (
    <FormField
      label="Radio permitido para registrar llegada"
      required
      error={error}
      description={error ? undefined : description}
    >
      {(controlProps) => (
        <div className="flex items-center gap-4">
          <div className="relative w-full max-w-40">
            <Input
              {...controlProps}
              type="number"
              inputMode="numeric"
              disabled={disabled}
              className="pr-9"
              {...registration}
            />
            <span
              aria-hidden="true"
              className="text-muted-foreground pointer-events-none absolute inset-y-0 right-3 flex items-center font-sans text-body-sm"
            >
              m
            </span>
          </div>

          <div className="flex shrink-0 flex-col items-center gap-1">
            <div
              aria-hidden="true"
              className="border-border bg-background relative flex items-center justify-center overflow-hidden rounded-full border"
              style={{ width: VISUAL_BOX_PX, height: VISUAL_BOX_PX }}
            >
              <span
                className="border-info bg-info/10 rounded-full border-2"
                style={{ width: diameter, height: diameter }}
              />
              <IconMapPin className="text-foreground absolute size-4" />
            </div>
            <Caption className="text-center">
              Representación aproximada del área permitida.
            </Caption>
          </div>
        </div>
      )}
    </FormField>
  )
}
