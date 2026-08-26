import type { UseFormRegisterReturn } from 'react-hook-form'

import { FormField, Input } from '@/shared/components'

export interface EventGeofenceRadiusFieldProps {
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

const BASE_HELPER_TEXT =
  'El personal debe estar dentro de esta distancia del salón para poder registrar su llegada.'

/**
 * Same confirmed 10-1000 m contract `createEventFormSchema`/
 * `editEventFormSchema` already enforce (Zod remains the actual source of
 * truth/error message) — exposed here only as the native `<input
 * min/max>` attributes, for the accessible/semantic hint browsers and
 * assistive tech derive from them (e.g. spinner-arrow bounds, ARIA
 * valuemin/valuemax). Native `min`/`max` on `type="number"` never clamps
 * or auto-corrects a typed value on its own — 9 or 1001 still reach Zod
 * exactly as typed, which still rejects them via `error` below.
 */
const RADIO_GEOCERCA_MIN = 10
const RADIO_GEOCERCA_MAX = 1000

/**
 * Presents `radioGeocercaM` as a real-world "arrival radius" rather than a
 * bare DTO number — same backend contract and 10-1000 m range as before
 * (`createEventFormSchema`/`editEventFormSchema`), with helper copy
 * explaining what the number means.
 *
 * No longer renders its own schematic circle: that CSS-scaled illustration
 * (never a real distance/map scale) has been retired now that
 * `EventGeofenceMapPreview` renders a REAL, geodesic map preview next to
 * this field on `EventCreateForm`/`EventEditForm`. Keeping both would show
 * two competing visualizations of the same value at once — one accurate,
 * one merely schematic — which is worse than showing only the accurate
 * one. `EventGeofenceMapPreview` already degrades gracefully on its own
 * (a compact empty/unavailable state) whenever Mapbox or the salón's
 * coordinates aren't available, so this field never needs a visual
 * fallback of its own to stay usable — it is, and remains, a plain numeric
 * input.
 */
export function EventGeofenceRadiusField({
  disabled,
  error,
  extraDescription,
  registration,
}: EventGeofenceRadiusFieldProps) {
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
        <div className="relative w-full max-w-40">
          <Input
            {...controlProps}
            type="number"
            numeric="integer"
            inputMode="numeric"
            min={RADIO_GEOCERCA_MIN}
            max={RADIO_GEOCERCA_MAX}
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
      )}
    </FormField>
  )
}
