import { useState } from 'react'

import type { InvitationDeeplinkResult } from '@/features/waiters/types/invitation'
import { Alert, Button, Dialog, Input, Text } from '@/shared/components'

export interface InvitationDeeplinkDialogProps {
  result: InvitationDeeplinkResult
  onClose: () => void
}

/**
 * Shown exactly once, right after a successful invite/resend —
 * `InvitacionService.invitar`'s own comment: "El deeplink se devuelve UNA
 * vez. No se puede volver a consultar." The database only ever stores its
 * SHA-256 hash, so if this dialog is dismissed without copying, the only
 * recovery is "Reenviar" from `InvitationsSection` (which invalidates this
 * one and issues a fresh one) — never re-fetching it. A `Dialog` rather
 * than the usual auto-dismissing `Toast` specifically because this value
 * cannot be recovered if missed.
 */
export function InvitationDeeplinkDialog({
  result,
  onClose,
}: InvitationDeeplinkDialogProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(result.deeplink)
      setCopied(true)
    } catch {
      // Clipboard access can fail (permissions, insecure context) — the
      // deeplink stays visible and selectable in the input either way, so
      // the user can still copy it manually.
    }
  }

  return (
    <Dialog open onClose={onClose} title="Invitación enviada">
      <div className="flex flex-col gap-4">
        <Alert tone="warning" title="Este enlace no se puede volver a consultar">
          <p>
            Cópialo ahora o compártelo con la persona invitada. Si se pierde, usa
            &quot;Reenviar&quot; desde la lista de invitaciones para generar uno nuevo.
          </p>
        </Alert>

        <div className="flex flex-col gap-1">
          <Text size="sm" className="text-muted-foreground">
            Enlace de registro
          </Text>
          <Input
            readOnly
            value={result.deeplink}
            onFocus={(event) => event.target.select()}
          />
        </div>

        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={() => void handleCopy()}>
            {copied ? 'Copiado' : 'Copiar enlace'}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
