import { IconBellRinging } from '@tabler/icons-react'
import { useId } from 'react'

import type {
  PublicDinerAttentionRequest,
  ServiceRequestStatus,
} from '@/features/public-diner/types/publicDiner'
import { Alert, Button, HelperText, Text } from '@/shared/components'

const DEFAULT_SUCCESS_MESSAGE = 'Hemos avisado a tu mesero. En un momento te atenderá.'
const DEFAULT_THROTTLED_MESSAGE =
  'Tu mesero ya fue avisado. Dale un momento para atenderte.'

export interface AttentionRequestActionProps {
  status: ServiceRequestStatus
  /** User-safe error text — never `technical_message`, never a raw SGEB code. */
  message?: string | undefined
  /**
   * Overrides the default success copy. Real integration can omit this
   * (the default already matches the suggested production wording); the
   * fixture-backed routed page overrides it with an honest
   * "this is a demo, nothing was actually sent" disclosure instead.
   */
  successMessage?: string | undefined
  /**
   * Invoked with the confirmed request payload, always
   * `{ tipo: 'atencion' }` — see `PublicDinerAttentionRequest`. Omit to
   * render the action genuinely disabled.
   */
  onRequestAttention?: ((request: PublicDinerAttentionRequest) => void) | undefined
}

/**
 * The one primary diner action. No "Pedir cuenta" and no "Otro" exist
 * anywhere in this feature — see docs/decisions.md's confirmed product
 * decision. `throttled` communicates SGEB-4014's meaning (a request is
 * already pending) using the dictionary's own approved copy, never the
 * raw code, and implements no client-side anti-spam timer — the server
 * owns that rule.
 */
export function AttentionRequestAction({
  status,
  message,
  successMessage = DEFAULT_SUCCESS_MESSAGE,
  onRequestAttention,
}: AttentionRequestActionProps) {
  const pendingId = useId()
  const isSubmitting = status === 'submitting'
  const isDisabled = !onRequestAttention

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        size="lg"
        icon={<IconBellRinging aria-hidden="true" />}
        loading={isSubmitting}
        disabled={isDisabled}
        onClick={
          onRequestAttention &&
          (() => {
            onRequestAttention({ tipo: 'atencion' })
          })
        }
        aria-describedby={isDisabled ? pendingId : undefined}
        className="w-full"
      >
        Llamar al mesero
      </Button>
      {isDisabled ? (
        <HelperText id={pendingId}>
          La solicitud de atención todavía no está disponible.
        </HelperText>
      ) : null}

      {status === 'success' ? (
        <Alert tone="success">
          <Text size="sm">{successMessage}</Text>
        </Alert>
      ) : null}
      {status === 'throttled' ? (
        <Alert tone="warning">
          <Text size="sm">{DEFAULT_THROTTLED_MESSAGE}</Text>
        </Alert>
      ) : null}
      {status === 'error' && message ? (
        <Alert tone="danger">
          <Text size="sm">{message}</Text>
        </Alert>
      ) : null}
    </div>
  )
}
