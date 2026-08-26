import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'

import {
  useCreateBebidaMutation,
  useDeactivateBebidaMutation,
  useDefinirRecetaMutation,
  useUpdateBebidaMutation,
} from '@/features/menu/queries/useBebidaMutations'
import { useBebidasQuery } from '@/features/menu/queries/useBebidasQuery'
import { useInsumosQuery } from '@/features/menu/queries/useInsumosQuery'
import {
  createBebidaSchema,
  definirRecetaSchema,
  type CreateBebidaFormValues,
  type DefinirRecetaFormValues,
} from '@/features/menu/schemas/menuSchemas'
import type { BebidaViewModel, TipoPorcion } from '@/features/menu/types/menu'
import { isSgebApplicationError, isSgebNetworkError } from '@/shared/api/sgebApiError'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  FormField,
  Input,
  Select,
  Skeleton,
  Text,
} from '@/shared/components'

const TIPO_PORCION_OPTIONS: readonly TipoPorcion[] = ['PROPORCION', 'FIJO_ML', 'RESTO']

const TIPO_PORCION_LABELS: Record<TipoPorcion, string> = {
  PROPORCION: 'Proporción (escala con el envase)',
  FIJO_ML: 'Fijo (ml, no escala)',
  RESTO: 'Resto (llena lo que sobre)',
}

function toSafeErrorMessage(error: unknown): string {
  if (isSgebApplicationError(error) || isSgebNetworkError(error)) {
    return error.message
  }
  return 'Ocurrió un error inesperado.'
}

interface BebidaFormProps {
  initialValues?: CreateBebidaFormValues | undefined
  isSubmitting: boolean
  onSubmit: (values: CreateBebidaFormValues) => void
}

function BebidaForm({ initialValues, isSubmitting, onSubmit }: BebidaFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateBebidaFormValues>({
    resolver: zodResolver(createBebidaSchema),
    defaultValues: initialValues ?? { nombre: '', descripcion: null, alcoholica: false },
  })

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="flex flex-col gap-4"
    >
      <FormField label="Nombre" required error={errors.nombre?.message}>
        {(controlProps) => (
          <Input {...controlProps} disabled={isSubmitting} {...register('nombre')} />
        )}
      </FormField>
      <FormField
        label="Descripción"
        description="Opcional"
        error={errors.descripcion?.message}
      >
        {(controlProps) => (
          <Input
            {...controlProps}
            maxLength={70}
            disabled={isSubmitting}
            {...register('descripcion', {
              setValueAs: (value: string) => (value === '' ? null : value),
            })}
          />
        )}
      </FormField>
      <label className="text-body-sm text-foreground flex w-fit items-center gap-2 font-sans">
        <input
          type="checkbox"
          className="border-input size-4 rounded"
          disabled={isSubmitting}
          {...register('alcoholica')}
        />
        Bebida alcohólica
      </label>
      <Button type="submit" loading={isSubmitting} className="w-full sm:w-auto">
        Guardar
      </Button>
    </form>
  )
}

/**
 * A `useFieldArray`-backed factory for a fresh recipe row — mirrors
 * `EventClosureWasteForm`'s `createEmptyDetailRow`: a new object per call so
 * React Hook Form never receives a reused/shared reference across
 * `append()`/`reset()` calls.
 */
function createEmptyIngredienteRow(
  ordenServido: number,
): DefinirRecetaFormValues['ingredientes'][number] {
  return { idInsumo: 0, tipoPorcion: 'PROPORCION', valor: 0, ordenServido }
}

interface RecetaFormProps {
  bebida: BebidaViewModel
  isSubmitting: boolean
  onSubmit: (values: DefinirRecetaFormValues) => void
}

function RecetaForm({ bebida, isSubmitting, onSubmit }: RecetaFormProps) {
  const insumosQuery = useInsumosQuery()

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DefinirRecetaFormValues>({
    resolver: zodResolver(definirRecetaSchema),
    defaultValues: {
      ingredientes:
        bebida.receta.length > 0
          ? bebida.receta.map((ingrediente) => ({
              idInsumo: ingrediente.idInsumo,
              tipoPorcion: ingrediente.tipoPorcion,
              valor: ingrediente.valor,
              ordenServido: ingrediente.ordenServido,
            }))
          : [createEmptyIngredienteRow(1)],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'ingredientes' })

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="flex flex-col gap-6"
    >
      {insumosQuery.isError ? (
        <Alert tone="danger">
          <p>No pudimos cargar los insumos para elegir en la receta.</p>
          <p>{toSafeErrorMessage(insumosQuery.error)}</p>
        </Alert>
      ) : null}
      {errors.ingredientes?.root?.message ? (
        <Alert tone="danger">
          <p>{errors.ingredientes.root.message}</p>
        </Alert>
      ) : null}

      {fields.map((field, index) => (
        <fieldset
          key={field.id}
          className="border-border flex flex-col gap-4 rounded-lg border p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <legend className="font-sans text-body-sm font-semibold">
              Ingrediente {index + 1}
            </legend>
            {fields.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isSubmitting}
                aria-label={`Quitar ingrediente ${String(index + 1)}`}
                onClick={() => remove(index)}
              >
                Quitar
              </Button>
            ) : null}
          </div>

          <FormField
            label={`Insumo ${index + 1}`}
            required
            error={errors.ingredientes?.[index]?.idInsumo?.message}
          >
            {(controlProps) => (
              <Select
                {...controlProps}
                disabled={isSubmitting || insumosQuery.isPending}
                {...register(`ingredientes.${index}.idInsumo`, { valueAsNumber: true })}
              >
                <option value="">Selecciona un insumo</option>
                {(insumosQuery.data ?? []).map((insumo) => (
                  <option key={insumo.idInsumo} value={insumo.idInsumo}>
                    {insumo.nombre}
                    {insumo.activo ? '' : ' (inactivo)'}
                  </option>
                ))}
              </Select>
            )}
          </FormField>

          <FormField
            label={`Tipo de porción ${index + 1}`}
            required
            error={errors.ingredientes?.[index]?.tipoPorcion?.message}
          >
            {(controlProps) => (
              <Select
                {...controlProps}
                disabled={isSubmitting}
                {...register(`ingredientes.${index}.tipoPorcion`)}
              >
                {TIPO_PORCION_OPTIONS.map((tipo) => (
                  <option key={tipo} value={tipo}>
                    {TIPO_PORCION_LABELS[tipo]}
                  </option>
                ))}
              </Select>
            )}
          </FormField>

          <FormField
            label={`Valor ${index + 1}`}
            description="Fracción 0–1 para Proporción, ml para Fijo, ignorado para Resto"
            error={errors.ingredientes?.[index]?.valor?.message}
          >
            {(controlProps) => (
              <Input
                {...controlProps}
                type="number"
                numeric="decimal"
                min={0}
                max={999.99}
                step="0.01"
                disabled={isSubmitting}
                {...register(`ingredientes.${index}.valor`, { valueAsNumber: true })}
              />
            )}
          </FormField>

          <FormField
            label={`Orden de servido ${index + 1}`}
            description="Orden en que se sirve, p. ej. 1, 2, 3…"
            required
            error={errors.ingredientes?.[index]?.ordenServido?.message}
          >
            {(controlProps) => (
              <Input
                {...controlProps}
                type="number"
                numeric="integer"
                min={1}
                max={255}
                step={1}
                disabled={isSubmitting}
                {...register(`ingredientes.${index}.ordenServido`, {
                  valueAsNumber: true,
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
        onClick={() => append(createEmptyIngredienteRow(fields.length + 1))}
      >
        Agregar ingrediente
      </Button>

      <Button type="submit" loading={isSubmitting} className="w-full sm:w-auto">
        Guardar receta
      </Button>
    </form>
  )
}

function recetaSummary(bebida: BebidaViewModel) {
  if (bebida.receta.length === 0) {
    return (
      <Text size="sm" className="text-destructive">
        Sin receta — no se puede dispensar (SGEB-3002)
      </Text>
    )
  }
  const count = bebida.receta.length
  return (
    <Text size="sm" className="text-muted-foreground">
      {count} {count === 1 ? 'ingrediente' : 'ingredientes'}
    </Text>
  )
}

/** `Bebidas y Cubaitor` global catalog — Bebidas tab. Real `GET/POST/PUT /bebidas`, `PUT /bebidas/{id}/receta`, `DELETE /bebidas/{id}`. */
export function BebidasSection() {
  const bebidasQuery = useBebidasQuery()
  const createMutation = useCreateBebidaMutation()
  const updateMutation = useUpdateBebidaMutation()
  const deactivateMutation = useDeactivateBebidaMutation()
  const definirRecetaMutation = useDefinirRecetaMutation()

  const [dialogMode, setDialogMode] = useState<'closed' | 'create' | number>('closed')
  const [formError, setFormError] = useState<string | undefined>(undefined)
  const [rowError, setRowError] = useState<Record<number, string>>({})

  const [recetaDialogIdBebida, setRecetaDialogIdBebida] = useState<number | null>(null)
  const [recetaFormError, setRecetaFormError] = useState<string | undefined>(undefined)

  const editingBebida =
    typeof dialogMode === 'number'
      ? (bebidasQuery.data?.find((b) => b.idBebida === dialogMode) ?? null)
      : null

  const recetaBebida =
    recetaDialogIdBebida !== null
      ? (bebidasQuery.data?.find((b) => b.idBebida === recetaDialogIdBebida) ?? null)
      : null

  function closeDialog() {
    setDialogMode('closed')
    setFormError(undefined)
  }

  function closeRecetaDialog() {
    setRecetaDialogIdBebida(null)
    setRecetaFormError(undefined)
  }

  function handleSubmit(values: CreateBebidaFormValues) {
    setFormError(undefined)
    if (typeof dialogMode === 'number') {
      updateMutation.mutate(
        { idBebida: dialogMode, input: values },
        {
          onSuccess: closeDialog,
          onError: (error) => setFormError(toSafeErrorMessage(error)),
        },
      )
      return
    }
    createMutation.mutate(values, {
      onSuccess: closeDialog,
      onError: (error) => setFormError(toSafeErrorMessage(error)),
    })
  }

  function handleRecetaSubmit(values: DefinirRecetaFormValues) {
    if (recetaDialogIdBebida === null) {
      return
    }
    setRecetaFormError(undefined)
    definirRecetaMutation.mutate(
      { idBebida: recetaDialogIdBebida, ingredientes: values.ingredientes },
      {
        onSuccess: closeRecetaDialog,
        onError: (error) => setRecetaFormError(toSafeErrorMessage(error)),
      },
    )
  }

  function handleDeactivate(idBebida: number) {
    setRowError((previous) => {
      const next = { ...previous }
      delete next[idBebida]
      return next
    })
    deactivateMutation.mutate(idBebida, {
      onError: (error) =>
        setRowError((previous) => ({
          ...previous,
          [idBebida]: toSafeErrorMessage(error),
        })),
    })
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Text size="sm" className="text-muted-foreground">
          Catálogo global de bebidas y sus recetas.
        </Text>
        <Button type="button" onClick={() => setDialogMode('create')}>
          Nueva bebida
        </Button>
      </div>

      {bebidasQuery.isPending ? (
        <div role="status" aria-label="Cargando bebidas" className="flex flex-col gap-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : bebidasQuery.isError ? (
        <Alert tone="danger" title="No pudimos cargar las bebidas">
          <p>{toSafeErrorMessage(bebidasQuery.error)}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-2 self-start"
            onClick={() => void bebidasQuery.refetch()}
          >
            Reintentar
          </Button>
        </Alert>
      ) : bebidasQuery.data.length === 0 ? (
        <div className="border-border rounded-lg border border-dashed p-10 text-center">
          <Text size="sm" className="text-muted-foreground">
            No hay bebidas registradas todavía.
          </Text>
        </div>
      ) : (
        <ul aria-label="Bebidas" className="flex flex-col gap-3">
          {bebidasQuery.data.map((bebida) => (
            <li key={bebida.idBebida}>
              <Card>
                <CardContent className="flex flex-wrap items-center gap-3 p-4">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Text className="font-medium">{bebida.nombre}</Text>
                      <Badge tone={bebida.alcoholica ? 'warning' : 'neutral'}>
                        {bebida.alcoholica ? 'Alcohólica' : 'Sin alcohol'}
                      </Badge>
                      {!bebida.activo ? <Badge tone="neutral">Inactiva</Badge> : null}
                    </div>
                    {bebida.descripcion ? (
                      <Text size="sm" className="text-muted-foreground">
                        {bebida.descripcion}
                      </Text>
                    ) : null}
                    {recetaSummary(bebida)}
                    {rowError[bebida.idBebida] ? (
                      <Text size="sm" className="text-destructive">
                        {rowError[bebida.idBebida]}
                      </Text>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRecetaDialogIdBebida(bebida.idBebida)
                      setRecetaFormError(undefined)
                    }}
                  >
                    Editar receta
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDialogMode(bebida.idBebida)}
                  >
                    Editar
                  </Button>
                  {bebida.activo ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      loading={deactivateMutation.isPending}
                      onClick={() => handleDeactivate(bebida.idBebida)}
                    >
                      Desactivar
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={dialogMode !== 'closed'}
        onClose={closeDialog}
        title={typeof dialogMode === 'number' ? 'Editar bebida' : 'Nueva bebida'}
      >
        {formError ? (
          <Alert tone="danger" className="mb-4">
            <p>{formError}</p>
          </Alert>
        ) : null}
        <BebidaForm
          key={typeof dialogMode === 'number' ? dialogMode : 'create'}
          initialValues={
            editingBebida
              ? {
                  nombre: editingBebida.nombre,
                  descripcion: editingBebida.descripcion,
                  alcoholica: editingBebida.alcoholica,
                }
              : undefined
          }
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
        />
      </Dialog>

      <Dialog
        open={recetaDialogIdBebida !== null}
        onClose={closeRecetaDialog}
        title={recetaBebida ? `Receta de ${recetaBebida.nombre}` : 'Receta'}
        className="sm:max-w-2xl"
      >
        {recetaFormError ? (
          <Alert tone="danger" className="mb-4">
            <p>{recetaFormError}</p>
          </Alert>
        ) : null}
        {recetaBebida ? (
          <RecetaForm
            key={recetaBebida.idBebida}
            bebida={recetaBebida}
            isSubmitting={definirRecetaMutation.isPending}
            onSubmit={handleRecetaSubmit}
          />
        ) : null}
      </Dialog>
    </div>
  )
}
