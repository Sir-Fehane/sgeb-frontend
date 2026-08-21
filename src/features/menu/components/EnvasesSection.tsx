import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import {
  useCreateEnvaseMutation,
  useDeactivateEnvaseMutation,
  useUpdateEnvaseMutation,
} from '@/features/menu/queries/useEnvaseMutations'
import { useEnvasesQuery } from '@/features/menu/queries/useEnvasesQuery'
import {
  createEnvaseSchema,
  type CreateEnvaseFormValues,
} from '@/features/menu/schemas/menuSchemas'
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
  Skeleton,
  Text,
} from '@/shared/components'

function toSafeErrorMessage(error: unknown): string {
  if (isSgebApplicationError(error) || isSgebNetworkError(error)) {
    return error.message
  }
  return 'Ocurrió un error inesperado.'
}

interface EnvaseFormProps {
  initialValues?: CreateEnvaseFormValues | undefined
  isSubmitting: boolean
  onSubmit: (values: CreateEnvaseFormValues) => void
}

function EnvaseForm({ initialValues, isSubmitting, onSubmit }: EnvaseFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateEnvaseFormValues>({
    resolver: zodResolver(createEnvaseSchema),
    defaultValues: initialValues ?? { nombre: '', volumenMl: 0 },
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
      <FormField label="Volumen (ml)" required error={errors.volumenMl?.message}>
        {(controlProps) => (
          <Input
            {...controlProps}
            type="number"
            min={1}
            max={65535}
            step={1}
            disabled={isSubmitting}
            {...register('volumenMl', { valueAsNumber: true })}
          />
        )}
      </FormField>
      <Button type="submit" loading={isSubmitting} className="w-full sm:w-auto">
        Guardar
      </Button>
    </form>
  )
}

/**
 * `Bebidas y Cubaitor` global catalog — Envases tab. Real `GET/POST/PUT
 * /envases`, `DELETE /envases/{id}`.
 *
 * Editing `volumenMl` here never recalculates orders already placed — each
 * `orden_detalle` freezes its own `volumen_total_ml` at the moment the order
 * was created (`services/menuApi.ts`'s `updateEnvase` comment). That is
 * confirmed backend behavior, not something this screen needs to warn about
 * or work around: an envase edit only changes what future orders will use.
 */
export function EnvasesSection() {
  const envasesQuery = useEnvasesQuery()
  const createMutation = useCreateEnvaseMutation()
  const updateMutation = useUpdateEnvaseMutation()
  const deactivateMutation = useDeactivateEnvaseMutation()

  const [dialogMode, setDialogMode] = useState<'closed' | 'create' | number>('closed')
  const [formError, setFormError] = useState<string | undefined>(undefined)
  const [rowError, setRowError] = useState<Record<number, string>>({})

  const editingEnvase =
    typeof dialogMode === 'number'
      ? (envasesQuery.data?.find((e) => e.idEnvase === dialogMode) ?? null)
      : null

  function closeDialog() {
    setDialogMode('closed')
    setFormError(undefined)
  }

  function handleSubmit(values: CreateEnvaseFormValues) {
    setFormError(undefined)
    if (typeof dialogMode === 'number') {
      updateMutation.mutate(
        { idEnvase: dialogMode, input: values },
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

  function handleDeactivate(idEnvase: number) {
    setRowError((previous) => {
      const next = { ...previous }
      delete next[idEnvase]
      return next
    })
    deactivateMutation.mutate(idEnvase, {
      onError: (error) =>
        setRowError((previous) => ({
          ...previous,
          [idEnvase]: toSafeErrorMessage(error),
        })),
    })
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Text size="sm" className="text-muted-foreground">
          Catálogo global de envases (tamaños de servido).
        </Text>
        <Button type="button" onClick={() => setDialogMode('create')}>
          Nuevo envase
        </Button>
      </div>

      {envasesQuery.isPending ? (
        <div role="status" aria-label="Cargando envases" className="flex flex-col gap-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : envasesQuery.isError ? (
        <Alert tone="danger" title="No pudimos cargar los envases">
          <p>{toSafeErrorMessage(envasesQuery.error)}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-2 self-start"
            onClick={() => void envasesQuery.refetch()}
          >
            Reintentar
          </Button>
        </Alert>
      ) : envasesQuery.data.length === 0 ? (
        <div className="border-border rounded-lg border border-dashed p-10 text-center">
          <Text size="sm" className="text-muted-foreground">
            No hay envases registrados todavía.
          </Text>
        </div>
      ) : (
        <ul aria-label="Envases" className="flex flex-col gap-3">
          {envasesQuery.data.map((envase) => (
            <li key={envase.idEnvase}>
              <Card>
                <CardContent className="flex flex-wrap items-center gap-3 p-4">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Text className="font-medium">{envase.nombre}</Text>
                      {!envase.activo ? <Badge tone="neutral">Inactivo</Badge> : null}
                    </div>
                    <Text size="sm" className="text-muted-foreground">
                      {envase.volumenMl} ml
                    </Text>
                    {rowError[envase.idEnvase] ? (
                      <Text size="sm" className="text-destructive">
                        {rowError[envase.idEnvase]}
                      </Text>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDialogMode(envase.idEnvase)}
                  >
                    Editar
                  </Button>
                  {envase.activo ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      loading={deactivateMutation.isPending}
                      onClick={() => handleDeactivate(envase.idEnvase)}
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
        title={typeof dialogMode === 'number' ? 'Editar envase' : 'Nuevo envase'}
      >
        {formError ? (
          <Alert tone="danger" className="mb-4">
            <p>{formError}</p>
          </Alert>
        ) : null}
        <EnvaseForm
          key={typeof dialogMode === 'number' ? dialogMode : 'create'}
          initialValues={
            editingEnvase
              ? { nombre: editingEnvase.nombre, volumenMl: editingEnvase.volumenMl }
              : undefined
          }
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
        />
      </Dialog>
    </div>
  )
}
