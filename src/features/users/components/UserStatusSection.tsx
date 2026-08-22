import { useState } from 'react'

import type { UserAccountStatus } from '@/features/users/types/user'
import { Alert, Badge, Button, SectionHeading, Text } from '@/shared/components'

export interface UserStatusSectionProps {
  estadoCuenta: UserAccountStatus
  /** `true` when this row is the caller's own account — the pinned backend rejects self-deactivation with `SGEB-4022`; this disables the action client-side first rather than relying only on that round trip. */
  isSelf: boolean
  onActivate: () => void
  onDeactivate: () => void
  isSubmitting?: boolean
  /** A safe, user-facing message for the most recent failed status change — never `technical_message`. */
  errorMessage?: string
}

/**
 * `PATCH /usuarios/{uuid}` `{activo}` — the one account-status action this
 * screen owns. Deactivation is consequential (cascades session/token/
 * trusted-device revocation server-side, `UsuarioService.cambiarEstado`) and
 * gets the same inline-confirmation pattern
 * `EventClosureFinalizeSection` establishes (no reusable confirmation
 * dialog exists yet in this codebase — see that component's own comment).
 * Reactivation has no such server-side consequence, so it's a single direct
 * action, no confirmation step.
 */
export function UserStatusSection({
  estadoCuenta,
  isSelf,
  onActivate,
  onDeactivate,
  isSubmitting = false,
  errorMessage,
}: UserStatusSectionProps) {
  const [isConfirmingDeactivate, setIsConfirmingDeactivate] = useState(false)

  return (
    <div className="flex flex-col gap-3">
      <SectionHeading className="text-subheading">Estado de la cuenta</SectionHeading>

      <div className="flex items-center justify-between gap-2">
        <Text size="sm">
          {estadoCuenta === 'activo'
            ? 'Esta cuenta está activa.'
            : 'Esta cuenta está inactiva.'}
        </Text>
        <Badge tone={estadoCuenta === 'activo' ? 'success' : 'neutral'}>
          {estadoCuenta === 'activo' ? 'Activo' : 'Inactivo'}
        </Badge>
      </div>

      {errorMessage ? (
        <Alert tone="danger" title="No se pudo cambiar el estado de la cuenta">
          <p>{errorMessage}</p>
        </Alert>
      ) : null}

      {isSelf ? (
        <Text size="sm" className="text-muted-foreground">
          No puedes cambiar el estado de tu propia cuenta desde aquí.
        </Text>
      ) : estadoCuenta === 'activo' ? (
        isConfirmingDeactivate ? (
          <Alert
            tone="warning"
            title="Esta acción cerrará su sesión en todos los equipos"
          >
            <p>
              Al desactivar la cuenta se revocan sus sesiones, tokens y dispositivos
              confiables. La cuenta puede reactivarse después.
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsConfirmingDeactivate(false)
                }}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={onDeactivate}
                disabled={isSubmitting}
                loading={isSubmitting}
              >
                Confirmar desactivación
              </Button>
            </div>
          </Alert>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => {
              setIsConfirmingDeactivate(true)
            }}
          >
            Desactivar cuenta
          </Button>
        )
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={onActivate}
          disabled={isSubmitting}
          loading={isSubmitting}
        >
          Activar cuenta
        </Button>
      )}
    </div>
  )
}
