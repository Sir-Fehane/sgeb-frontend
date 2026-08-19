import {
  EventCreateSalonForm,
  type EventCreateSalonFormProps,
} from '@/features/events/components/EventCreateSalonForm'
import { Dialog } from '@/shared/components'

export interface EventCreateSalonDialogProps extends EventCreateSalonFormProps {
  open: boolean
}

/**
 * Wraps `EventCreateSalonForm` (address + map + location picker) in a
 * focused `Dialog` instead of expanding it inline underneath
 * `EventCreateForm` — now that Salón creation includes a real map and
 * several fields, keeping it inline made event creation excessively long
 * and visually mixed two separate tasks. The event form behind it is
 * untouched by this: `Dialog` makes the rest of the page `inert` while
 * open, and this component owns no state of its own beyond forwarding
 * `open`/the form's existing props — `EventCreatePage` still owns
 * `showCreateSalon`, exactly as it did before this existed.
 */
export function EventCreateSalonDialog({
  open,
  ...formProps
}: EventCreateSalonDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={formProps.onCancel}
      title="Crear salón"
      description="Completa los datos del salón. Se seleccionará automáticamente para este evento en cuanto se cree."
      className="sm:max-w-2xl"
    >
      <EventCreateSalonForm {...formProps} />
    </Dialog>
  )
}
