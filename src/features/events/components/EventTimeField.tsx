import { IconClock } from '@tabler/icons-react'
import type { UseFormRegisterReturn } from 'react-hook-form'

import { FormField, Input } from '@/shared/components'

export interface EventTimeFieldProps {
  label: string
  disabled?: boolean | undefined
  error?: string | undefined
  /** `register('hora_presentacion' | 'hora_inicio')` — spread directly onto the `<input type="time">`. */
  registration: UseFormRegisterReturn
}

/**
 * The native `<input type="time">` — kept deliberately (see this branch's
 * report for the full native-vs-custom audit): it already gives every
 * browser/OS's own accessible, keyboard-operable time control (arrow keys
 * to step, digit typing, a native mobile wheel/clock UI) and reports
 * exactly the `HH:MM` string `hora_presentacion`/`hora_inicio` already
 * require — no seconds, no timezone, nothing this component or its caller
 * has to reconcile. This wrapper only adds a leading `IconClock` for
 * visual consistency with `EventGeofenceRadiusField`'s "m" suffix
 * treatment; it never fakes or replaces the native picker.
 */
export function EventTimeField({
  label,
  disabled,
  error,
  registration,
}: EventTimeFieldProps) {
  return (
    <FormField label={label} required error={error}>
      {(controlProps) => (
        <div className="relative">
          <IconClock
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none absolute inset-y-0 left-3 my-auto size-4"
          />
          <Input
            {...controlProps}
            type="time"
            disabled={disabled}
            className="pl-9"
            {...registration}
          />
        </div>
      )}
    </FormField>
  )
}
