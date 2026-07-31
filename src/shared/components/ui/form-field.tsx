import { useId, type ReactNode } from 'react'

import { Label } from '@/shared/components/ui/label'
import { ErrorText, HelperText } from '@/shared/components/ui/typography'
import { cn } from '@/shared/utils/cn'

export interface FormFieldControlProps {
  id: string
  required: boolean | undefined
  'aria-describedby': string | undefined
  'aria-invalid': true | undefined
}

export interface FormFieldProps {
  /** Visible label text — every control rendered by this field is labeled. */
  label: string
  description?: string
  /** When present, replaces the description and marks the control invalid. */
  error?: string
  required?: boolean
  className?: string
  /**
   * Render-prop so `FormField` works with any control (our `Input`,
   * `Textarea`, or a future RHF-bound control) without cloning children or
   * hiding the id/aria wiring behind context.
   */
  children: (controlProps: FormFieldControlProps) => ReactNode
}

/**
 * Label + control + description/error structure, with `id`/`aria-describedby`/
 * `aria-invalid` wired automatically so every field is correctly labeled and
 * every error is announced to assistive technology.
 */
export function FormField({
  label,
  description,
  error,
  required,
  className,
  children,
}: FormFieldProps) {
  const id = useId()
  const descriptionId = description && !error ? `${id}-description` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id}>
        {label}
        {required ? (
          <>
            <span aria-hidden="true" className="text-destructive">
              {' '}
              *
            </span>
            <span className="sr-only"> (requerido)</span>
          </>
        ) : null}
      </Label>
      {children({
        id,
        required,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
      })}
      {description && !error ? (
        <HelperText id={descriptionId}>{description}</HelperText>
      ) : null}
      {error ? <ErrorText id={errorId}>{error}</ErrorText> : null}
    </div>
  )
}
