import { IconEye, IconEyeOff } from '@tabler/icons-react'
import { useState, type ComponentPropsWithoutRef } from 'react'

import { Input } from '@/shared/components'
import { cn } from '@/shared/utils/cn'

export type PasswordInputProps = Omit<ComponentPropsWithoutRef<'input'>, 'type'>

/**
 * `Input` with a show/hide toggle, matching S1/S6's "eye" affordance.
 * Forwards every prop (including `FormField`'s `aria-invalid`/
 * `aria-describedby`) straight through to the underlying `Input`.
 */
export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        type={visible ? 'text' : 'password'}
        className={cn('pr-10', className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => {
          setVisible((value) => !value)
        }}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        aria-pressed={visible}
        className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex w-10 items-center justify-center"
      >
        {visible ? (
          <IconEyeOff aria-hidden="true" className="size-5" />
        ) : (
          <IconEye aria-hidden="true" className="size-5" />
        )}
      </button>
    </div>
  )
}
