import { IconCheck, IconX } from '@tabler/icons-react'

import { Caption } from '@/shared/components'
import { PASSWORD_REQUIREMENTS } from '@/features/auth/utils/passwordRequirements'
import { cn } from '@/shared/utils/cn'

export interface PasswordRequirementsListProps {
  password: string
}

/**
 * Live checklist for S6's "Requisitos" block. Every requirement pairs an
 * icon with text (and a screen-reader-only status word) — never
 * communicated by color alone.
 */
export function PasswordRequirementsList({ password }: PasswordRequirementsListProps) {
  return (
    <ul aria-label="Requisitos de la contraseña" className="flex flex-col gap-1">
      {PASSWORD_REQUIREMENTS.map((requirement) => {
        const met = requirement.met(password)
        return (
          <li key={requirement.id} className="flex items-center gap-2">
            {met ? (
              <IconCheck aria-hidden="true" className="text-success size-4 shrink-0" />
            ) : (
              <IconX
                aria-hidden="true"
                className="text-muted-foreground size-4 shrink-0"
              />
            )}
            <Caption className={cn(met && 'text-success')}>
              {requirement.label}
              <span className="sr-only">{met ? ' (cumplido)' : ' (pendiente)'}</span>
            </Caption>
          </li>
        )
      })}
    </ul>
  )
}
