import {
  InviteStaffForm,
  type InviteStaffFormProps,
} from '@/features/users/components/InviteStaffForm'
import { Dialog } from '@/shared/components'

export interface InviteStaffDialogProps extends InviteStaffFormProps {
  open: boolean
}

/** Wraps `InviteStaffForm` in a focused `Dialog` — mirrors `WaitersInviteDialog`'s identical thin-wrapper pattern. */
export function InviteStaffDialog({ open, ...formProps }: InviteStaffDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={formProps.onCancel}
      title="Invitar capitán o administrador"
      description="Se enviará un correo con un enlace de registro válido por 72 horas."
    >
      <InviteStaffForm {...formProps} />
    </Dialog>
  )
}
