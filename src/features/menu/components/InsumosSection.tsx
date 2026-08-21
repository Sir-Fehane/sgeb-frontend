import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import {
  useCreateInsumoMutation,
  useDeactivateInsumoMutation,
  useUpdateInsumoEstadoMutation,
  useUpdateInsumoMutation,
} from '@/features/menu/queries/useInsumoMutations'
import { useInsumosQuery } from '@/features/menu/queries/useInsumosQuery'
import {
  createInsumoSchema,
  INSUMO_TIPOS,
  type CreateInsumoFormValues,
} from '@/features/menu/schemas/menuSchemas'
import type { InsumoEstado, InsumoViewModel } from '@/features/menu/types/menu'
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
import { isSgebApplicationError, isSgebNetworkError } from '@/shared/api/sgebApiError'

const INSUMO_TIPO_LABELS: Record<InsumoViewModel['tipo'], string> = {
  alcohol: 'Alcohol',
  refresco: 'Refresco',
  jugo: 'Jugo',
  agua: 'Agua',
  otro: 'Otro',
}

const INSUMO_ESTADO_TONE: Record<
  InsumoEstado,
  'success' | 'warning' | 'danger' | 'neutral'
> = {
  disponible: 'success',
  bajo: 'warning',
  agotado: 'danger',
  inactivo: 'neutral',
}

function toSafeErrorMessage(error: unknown): string {
  if (isSgebApplicationError(error) || isSgebNetworkError(error)) {
    return error.message
  }
  return 'Ocurrió un error inesperado.'
}

interface InsumoFormProps {
  initialValues?: CreateInsumoFormValues | undefined
  isSubmitting: boolean
  onSubmit: (values: CreateInsumoFormValues) => void
}

function InsumoForm({ initialValues, isSubmitting, onSubmit }: InsumoFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateInsumoFormValues>({
    resolver: zodResolver(createInsumoSchema),
    defaultValues: initialValues ?? { nombre: '', tipo: 'alcohol', unidad: '', costo: 0 },
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
      <FormField label="Tipo" required error={errors.tipo?.message}>
        {(controlProps) => (
          <Select {...controlProps} disabled={isSubmitting} {...register('tipo')}>
            {INSUMO_TIPOS.map((tipo) => (
              <option key={tipo} value={tipo}>
                {INSUMO_TIPO_LABELS[tipo]}
              </option>
            ))}
          </Select>
        )}
      </FormField>
      <FormField
        label="Unidad"
        description="Ej. ml, oz, pza"
        required
        error={errors.unidad?.message}
      >
        {(controlProps) => (
          <Input
            {...controlProps}
            maxLength={10}
            disabled={isSubmitting}
            {...register('unidad')}
          />
        )}
      </FormField>
      <FormField label="Costo (MXN)" required error={errors.costo?.message}>
        {(controlProps) => (
          <Input
            {...controlProps}
            type="number"
            min={0}
            max={99999.99}
            step="0.01"
            disabled={isSubmitting}
            {...register('costo', { valueAsNumber: true })}
          />
        )}
      </FormField>
      <Button type="submit" loading={isSubmitting} className="w-full sm:w-auto">
        Guardar
      </Button>
    </form>
  )
}

/** `Bebidas y Cubaitor` global catalog — Insumos tab. Real `GET/POST/PUT /insumos`, `PATCH /insumos/{id}/estado`, `DELETE /insumos/{id}`. */
export function InsumosSection() {
  const insumosQuery = useInsumosQuery()
  const createMutation = useCreateInsumoMutation()
  const updateMutation = useUpdateInsumoMutation()
  const estadoMutation = useUpdateInsumoEstadoMutation()
  const deactivateMutation = useDeactivateInsumoMutation()

  const [dialogMode, setDialogMode] = useState<'closed' | 'create' | number>('closed')
  const [formError, setFormError] = useState<string | undefined>(undefined)
  const [rowError, setRowError] = useState<Record<number, string>>({})

  const editingInsumo =
    typeof dialogMode === 'number'
      ? (insumosQuery.data?.find((i) => i.idInsumo === dialogMode) ?? null)
      : null

  function closeDialog() {
    setDialogMode('closed')
    setFormError(undefined)
  }

  function handleSubmit(values: CreateInsumoFormValues) {
    setFormError(undefined)
    if (typeof dialogMode === 'number') {
      updateMutation.mutate(
        { idInsumo: dialogMode, input: values },
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

  function handleEstadoChange(idInsumo: number, estado: InsumoEstado) {
    setRowError((previous) => {
      const next = { ...previous }
      delete next[idInsumo]
      return next
    })
    estadoMutation.mutate(
      { idInsumo, estado },
      {
        onError: (error) =>
          setRowError((previous) => ({
            ...previous,
            [idInsumo]: toSafeErrorMessage(error),
          })),
      },
    )
  }

  function handleDeactivate(idInsumo: number) {
    setRowError((previous) => {
      const next = { ...previous }
      delete next[idInsumo]
      return next
    })
    deactivateMutation.mutate(idInsumo, {
      onError: (error) =>
        setRowError((previous) => ({
          ...previous,
          [idInsumo]: toSafeErrorMessage(error),
        })),
    })
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Text size="sm" className="text-muted-foreground">
          Catálogo global de insumos (ingredientes/insumos usados en recetas).
        </Text>
        <Button type="button" onClick={() => setDialogMode('create')}>
          Nuevo insumo
        </Button>
      </div>

      {insumosQuery.isPending ? (
        <div role="status" aria-label="Cargando insumos" className="flex flex-col gap-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : insumosQuery.isError ? (
        <Alert tone="danger" title="No pudimos cargar los insumos">
          <p>{toSafeErrorMessage(insumosQuery.error)}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-2 self-start"
            onClick={() => void insumosQuery.refetch()}
          >
            Reintentar
          </Button>
        </Alert>
      ) : insumosQuery.data.length === 0 ? (
        <div className="border-border rounded-lg border border-dashed p-10 text-center">
          <Text size="sm" className="text-muted-foreground">
            No hay insumos registrados todavía.
          </Text>
        </div>
      ) : (
        <ul aria-label="Insumos" className="flex flex-col gap-3">
          {insumosQuery.data.map((insumo) => (
            <li key={insumo.idInsumo}>
              <Card>
                <CardContent className="flex flex-wrap items-center gap-3 p-4">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Text className="font-medium">{insumo.nombre}</Text>
                      {!insumo.activo ? <Badge tone="neutral">Inactivo</Badge> : null}
                    </div>
                    <Text size="sm" className="text-muted-foreground">
                      {INSUMO_TIPO_LABELS[insumo.tipo]} · {insumo.unidad} · $
                      {insumo.costo.toFixed(2)} MXN
                    </Text>
                    {rowError[insumo.idInsumo] ? (
                      <Text size="sm" className="text-destructive">
                        {rowError[insumo.idInsumo]}
                      </Text>
                    ) : null}
                  </div>
                  <Badge tone={INSUMO_ESTADO_TONE[insumo.estado]}>{insumo.estado}</Badge>
                  <Select
                    aria-label={`Cambiar estado de ${insumo.nombre}`}
                    value={insumo.estado}
                    disabled={!insumo.activo || estadoMutation.isPending}
                    onChange={(event) =>
                      handleEstadoChange(
                        insumo.idInsumo,
                        event.target.value as InsumoEstado,
                      )
                    }
                    className="w-auto"
                  >
                    <option value="disponible">Disponible</option>
                    <option value="bajo">Bajo</option>
                    <option value="agotado">Agotado</option>
                    <option value="inactivo">Inactivo</option>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDialogMode(insumo.idInsumo)}
                  >
                    Editar
                  </Button>
                  {insumo.activo ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      loading={deactivateMutation.isPending}
                      onClick={() => handleDeactivate(insumo.idInsumo)}
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
        title={typeof dialogMode === 'number' ? 'Editar insumo' : 'Nuevo insumo'}
      >
        {formError ? (
          <Alert tone="danger" className="mb-4">
            <p>{formError}</p>
          </Alert>
        ) : null}
        <InsumoForm
          key={typeof dialogMode === 'number' ? dialogMode : 'create'}
          initialValues={
            editingInsumo
              ? {
                  nombre: editingInsumo.nombre,
                  tipo: editingInsumo.tipo,
                  unidad: editingInsumo.unidad,
                  costo: editingInsumo.costo,
                }
              : undefined
          }
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
        />
      </Dialog>
    </div>
  )
}
