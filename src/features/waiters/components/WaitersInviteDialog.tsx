import {
  WaitersInviteForm,
  type WaitersInviteFormProps,
} from '@/features/waiters/components/WaitersInviteForm'
import { Dialog } from '@/shared/components'

export interface WaitersInviteDialogProps extends WaitersInviteFormProps {
  open: boolean
}

/**
 * Wraps `WaitersInviteForm` in a focused `Dialog` — mirrors
 * `EventCreateSalonDialog`'s identical thin-wrapper pattern. Owns no state
 * of its own beyond forwarding `open`/the form's existing props;
 * `WaitersPage` owns whether it's open and the mesero role-id resolution
 * that gates enabling the "Invitar mesero" button in the first place.
 */
export function WaitersInviteDialog({ open, ...formProps }: WaitersInviteDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={formProps.onCancel}
      title="Invitar mesero"
      description="Se enviará un correo con un enlace de registro válido por 72 horas."
    >
      <WaitersInviteForm {...formProps} />
    </Dialog>
  )
}
