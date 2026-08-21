import { zodResolver } from '@hookform/resolvers/zod'
import { IconStar, IconStarFilled } from '@tabler/icons-react'
import { useId } from 'react'
import { Controller, useForm } from 'react-hook-form'

import {
  ratingSchema,
  type RatingFormInput,
} from '@/features/public-diner/schemas/ratingSchema'
import type {
  PublicDinerRatingValues,
  RatingStatus,
} from '@/features/public-diner/types/publicDiner'
import { Alert, Button, ErrorText, FormField, Text, Textarea } from '@/shared/components'
import { cn } from '@/shared/utils/cn'

export interface RatingFormProps {
  status: RatingStatus
  /** User-safe error text — never `technical_message`, never a raw SGEB code. */
  message?: string | undefined
  /**
   * Overrides the default thank-you copy. Real integration can omit
   * this; the fixture-backed routed page overrides it with an honest
   * "this is a demo, nothing was actually sent" disclosure instead.
   */
  successMessage?: string | undefined
  /** Omit to render the submit action genuinely disabled. */
  onSubmitRating?: ((values: PublicDinerRatingValues) => void) | undefined
}

const COMENTARIO_MAX_LENGTH = 255
const DEFAULT_SUCCESS_MESSAGE = 'Tu opinión nos ayuda a mejorar el servicio.'

const SCORE_OPTIONS: readonly { value: 1 | 2 | 3 | 4 | 5; label: string }[] = [
  { value: 1, label: '1 de 5 — Pésimo' },
  { value: 2, label: '2 de 5' },
  { value: 3, label: '3 de 5' },
  { value: 4, label: '4 de 5' },
  { value: 5, label: '5 de 5 — Excelente' },
]

/**
 * A controlled, accessible rating form — native `<input type="radio">`
 * elements inside a `<fieldset>`/`<legend>` (real radio-group semantics
 * for free, no hand-rolled `role="radio"` bookkeeping, and native
 * arrow-key navigation between options within the group for free too —
 * no extra keyboard handling needed). Star icons are a decorative
 * enhancement only (`aria-hidden`); each label's accessible name comes
 * from one visible-to-AT span ("1 de 5 — Pésimo", etc.) — see
 * `SCORE_OPTIONS`. Selection is shown via icon shape (outline → filled)
 * plus a border change, never color alone. Fill is cumulative — choosing
 * 3 visually fills stars 1–3, matching the conventional star-rating
 * reading (★★★☆☆), not just the exact star tapped. Only ONE radio input
 * is ever natively `checked` (the exact chosen value — required for
 * correct assistive-technology semantics); `filled` below is a separate,
 * purely visual prefix-fill computed from that same value.
 *
 * `token_comensal` is never part of this form — see
 * `PublicDinerRatingValues`'s doc comment.
 */
export function RatingForm({
  status,
  message,
  successMessage = DEFAULT_SUCCESS_MESSAGE,
  onSubmitRating,
}: RatingFormProps) {
  const legendId = useId()
  const scoreErrorId = useId()

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RatingFormInput, unknown, PublicDinerRatingValues>({
    resolver: zodResolver(ratingSchema),
  })

  const isSubmitting = status === 'submitting'

  if (status === 'success') {
    return (
      <Alert tone="success" title="¡Gracias por tu calificación!">
        <Text size="sm">{successMessage}</Text>
      </Alert>
    )
  }

  if (status === 'already-submitted') {
    return (
      <Alert tone="info">
        <Text size="sm">Ya registraste tu calificación para esta mesa. ¡Gracias!</Text>
      </Alert>
    )
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        void handleSubmit((values) => {
          onSubmitRating?.(values)
        })(event)
      }}
      className="flex flex-col gap-4"
    >
      <fieldset
        className="flex flex-col gap-2"
        disabled={isSubmitting}
        aria-describedby={errors.puntuacion ? scoreErrorId : undefined}
      >
        <legend
          id={legendId}
          className="font-sans text-label text-foreground font-medium"
        >
          ¿Cómo calificarías a tu mesero?
        </legend>
        <Controller
          name="puntuacion"
          control={control}
          render={({ field }) => (
            <div
              role="radiogroup"
              aria-labelledby={legendId}
              className="flex flex-wrap gap-2"
            >
              {SCORE_OPTIONS.map((option, index) => {
                const checked = field.value === option.value
                const filled = field.value !== undefined && option.value <= field.value
                return (
                  <label
                    key={option.value}
                    className={cn(
                      'flex min-h-11 min-w-11 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border p-2',
                      'has-focus-visible:ring-ring has-focus-visible:ring-offset-background has-focus-visible:ring-2 has-focus-visible:ring-offset-2',
                      filled ? 'border-primary bg-primary/10' : 'border-input',
                    )}
                  >
                    <input
                      type="radio"
                      name={field.name}
                      value={option.value}
                      checked={checked}
                      onChange={() => {
                        field.onChange(option.value)
                      }}
                      onBlur={field.onBlur}
                      // A radio group is one field — RHF only needs one ref per
                      // field name (used for focus-on-error), so it's attached
                      // to just the first option rather than all five.
                      ref={index === 0 ? field.ref : undefined}
                      className="sr-only"
                    />
                    {filled ? (
                      <IconStarFilled
                        aria-hidden="true"
                        className="text-primary size-5"
                      />
                    ) : (
                      <IconStar
                        aria-hidden="true"
                        className="text-muted-foreground size-5"
                      />
                    )}
                    <span
                      aria-hidden="true"
                      className="font-sans text-label font-semibold"
                    >
                      {option.value}
                    </span>
                    <span className="sr-only">{option.label}</span>
                  </label>
                )
              })}
            </div>
          )}
        />
        {errors.puntuacion ? (
          <ErrorText id={scoreErrorId}>{errors.puntuacion.message}</ErrorText>
        ) : null}
      </fieldset>

      <FormField
        label="Comentario (opcional)"
        description={`Máximo ${String(COMENTARIO_MAX_LENGTH)} caracteres.`}
        error={errors.comentario?.message}
      >
        {(controlProps) => (
          <Textarea
            {...controlProps}
            maxLength={COMENTARIO_MAX_LENGTH}
            disabled={isSubmitting}
            {...register('comentario')}
          />
        )}
      </FormField>

      {status === 'error' && message ? <Alert tone="danger">{message}</Alert> : null}

      <Button
        type="submit"
        loading={isSubmitting}
        disabled={!onSubmitRating}
        className="w-full"
      >
        Enviar calificación
      </Button>
    </form>
  )
}
