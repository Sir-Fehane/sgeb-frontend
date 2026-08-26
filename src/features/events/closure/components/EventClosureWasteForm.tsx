import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'

import {
  createWasteReportSchema,
  WASTE_TYPES,
  type CreateWasteReportFormValues,
} from '@/features/events/closure/schemas/wasteReportSchema'
import { WASTE_TYPE_LABELS } from '@/features/events/closure/utils/closurePresentation'
import { Button, FormField, Input, Select, Text, Textarea } from '@/shared/components'

export interface EventClosureWasteFormProps {
  /** May reject (e.g. a business-rule error from the real `POST`) — `submit` below catches that and leaves the row as-is, rather than resetting/showing success, so the caller's own error UI (`EventClosureContent`'s `wasteReportErrorMessage`) stays the single source of truth for what went wrong. */
  onSubmit: (values: CreateWasteReportFormValues) => Promise<void>
  isSubmitting?: boolean
}

/**
 * `tipo: ''` is not a valid `WasteType`, but mirrors `EventCreateForm`'s
 * established "empty placeholder option forces a real selection" pattern
 * — Zod's `.enum(WASTE_TYPES)` rejects it at submit time, producing the
 * same required-field error as an unselected `<Select>`. The one cast
 * below is contained to this factory.
 *
 * A FACTORY, not a shared constant: `defaultValues`, `reset()`, and
 * `useFieldArray.append()` are each given their own fresh object, rather
 * than one object reused across mount/every "Agregar artículo" click/every
 * post-submit `reset()` — defensive against React Hook Form taking
 * ownership of (and potentially mutating) whatever reference it's handed.
 */
function createEmptyDetailRow(): CreateWasteReportFormValues['detalles'][number] {
  return {
    tipo: '',
    descripcion: null,
    cantidad: 1,
    costo_estimado: null,
  } as unknown as CreateWasteReportFormValues['detalles'][number]
}

/**
 * React Hook Form syncs a registered `<input>` against `defaultValues` on
 * mount by passing the RAW default straight through `setValueAs` — not a
 * DOM string like every subsequent `onChange` call gives it. For this
 * field, `costo_estimado`'s default is `null` (documented `nullable:
 * true`), so `setValueAs` must handle `null`/`undefined` directly, not
 * only `''`. Without this, `Number(null)` evaluates to `0` and every
 * untouched row silently submits `costo_estimado: 0` instead of `null` —
 * confirmed by isolated reproduction against a minimal RHF form before
 * writing this fix, not guessed.
 */
function parseOptionalCosto(value: string | number | null | undefined): number | null {
  if (value === '' || value === null || value === undefined) {
    return null
  }
  return Number(value)
}

/**
 * A `useFieldArray`-backed merma report form. `onSubmit` is a typed
 * callback the page wires to the real `POST
 * /eventos/{id_evento}/reportes-merma` mutation — this component itself
 * stays agnostic of the network, just like before this branch went live.
 * Adding/removing a row is local form editing only — never described as
 * deleting a recorded report — and the last remaining row can never be
 * removed (mirrors the documented `minItems: 1`).
 */
export function EventClosureWasteForm({
  onSubmit,
  isSubmitting = false,
}: EventClosureWasteFormProps) {
  const [showSuccess, setShowSuccess] = useState(false)

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateWasteReportFormValues>({
    resolver: zodResolver(createWasteReportSchema),
    defaultValues: {
      observaciones: null,
      detalles: [createEmptyDetailRow()],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'detalles' })

  async function submit(values: CreateWasteReportFormValues) {
    setShowSuccess(false)
    try {
      await onSubmit(values)
    } catch {
      // The caller's own error UI (`EventClosureContent`'s
      // `wasteReportErrorMessage`, sourced from the mutation's error
      // state) already surfaces what went wrong — this form just leaves
      // the row exactly as the captain left it, so they can fix it and
      // resubmit rather than losing their input to a false reset.
      return
    }
    reset({ observaciones: null, detalles: [createEmptyDetailRow()] })
    setShowSuccess(true)
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(submit)(event)}
      className="flex flex-col gap-6"
    >
      {fields.map((field, index) => (
        <fieldset
          key={field.id}
          className="border-border flex flex-col gap-4 rounded-lg border p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <legend className="font-sans text-body-sm font-semibold">
              Artículo {index + 1}
            </legend>
            {fields.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isSubmitting}
                aria-label={`Quitar artículo ${String(index + 1)}`}
                onClick={() => remove(index)}
              >
                Quitar
              </Button>
            ) : null}
          </div>

          <FormField
            label={`Tipo de artículo ${String(index + 1)}`}
            required
            error={errors.detalles?.[index]?.tipo?.message}
          >
            {(controlProps) => (
              <Select
                {...controlProps}
                disabled={isSubmitting}
                {...register(`detalles.${index}.tipo`)}
              >
                <option value="">Selecciona un tipo</option>
                {WASTE_TYPES.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {WASTE_TYPE_LABELS[tipo]}
                  </option>
                ))}
              </Select>
            )}
          </FormField>

          <FormField
            label={`Cantidad ${String(index + 1)}`}
            required
            error={errors.detalles?.[index]?.cantidad?.message}
          >
            {(controlProps) => (
              <Input
                {...controlProps}
                type="number"
                numeric="integer"
                min={1}
                max={65535}
                step={1}
                disabled={isSubmitting}
                {...register(`detalles.${index}.cantidad`, { valueAsNumber: true })}
              />
            )}
          </FormField>

          <FormField
            label={`Descripción ${String(index + 1)}`}
            description="Opcional"
            error={errors.detalles?.[index]?.descripcion?.message}
          >
            {(controlProps) => (
              <Input
                {...controlProps}
                maxLength={150}
                disabled={isSubmitting}
                {...register(`detalles.${index}.descripcion`, {
                  setValueAs: (value: string) => (value === '' ? null : value),
                })}
              />
            )}
          </FormField>

          <FormField
            label={`Costo estimado ${String(index + 1)} (MXN)`}
            description="Opcional"
            error={errors.detalles?.[index]?.costo_estimado?.message}
          >
            {(controlProps) => (
              <Input
                {...controlProps}
                type="number"
                numeric="decimal"
                min={0}
                max={999999.99}
                step="0.01"
                disabled={isSubmitting}
                {...register(`detalles.${index}.costo_estimado`, {
                  setValueAs: parseOptionalCosto,
                })}
              />
            )}
          </FormField>
        </fieldset>
      ))}

      <Button
        type="button"
        variant="outline"
        className="w-fit"
        disabled={isSubmitting}
        onClick={() => append(createEmptyDetailRow())}
      >
        Agregar artículo
      </Button>

      <FormField
        label="Observaciones"
        description="Opcional"
        error={errors.observaciones?.message}
      >
        {(controlProps) => (
          <Textarea
            {...controlProps}
            maxLength={255}
            disabled={isSubmitting}
            {...register('observaciones', {
              setValueAs: (value: string) => (value === '' ? null : value),
            })}
          />
        )}
      </FormField>

      {showSuccess ? (
        <Text size="sm" className="text-success" role="status">
          Reporte registrado.
        </Text>
      ) : null}

      <Button type="submit" loading={isSubmitting} className="w-full sm:w-auto">
        Registrar reporte de merma
      </Button>
    </form>
  )
}
