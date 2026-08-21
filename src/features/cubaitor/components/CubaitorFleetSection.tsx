import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import {
  useCreateCubaitorMutation,
  useDeactivateCubaitorMutation,
  useUpdateCubaitorMutation,
} from '@/features/cubaitor/queries/useCubaitorMutations'
import { useCubaitorsQuery } from '@/features/cubaitor/queries/useCubaitorsQuery'
import {
  CUBAITOR_ESTADOS,
  createCubaitorSchema,
  updateCubaitorSchema,
  type CreateCubaitorFormValues,
  type UpdateCubaitorFormValues,
} from '@/features/cubaitor/schemas/cubaitorSchemas'
import type { CubaitorEstado } from '@/features/cubaitor/types/cubaitor'
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

const CUBAITOR_ESTADO_LABELS: Record<CubaitorEstado, string> = {
  activo: 'Activo',
  inactivo: 'Inactivo',
  mantenimiento: 'Mantenimiento',
}

const CUBAITOR_ESTADO_TONE: Record<CubaitorEstado, 'success' | 'warning' | 'neutral'> = {
  activo: 'success',
  inactivo: 'neutral',
  mantenimiento: 'warning',
}

function toSafeErrorMessage(error: unknown): string {
  if (isSgebApplicationError(error) || isSgebNetworkError(error)) {
    return error.message
  }
  return 'Ocurrió un error inesperado.'
}

/**
 * Honest, non-live rendering of `ultimaConexion` — never a colored "En
 * línea"/"Fuera de línea" badge. See `types/cubaitor.ts`'s module comment:
 * `en_linea`/heartbeat is confirmed dead in production (no route ever
 * writes it), so this fleet list must not claim to know whether a device is
 * currently reachable. This is plain informational text only.
 */
function formatUltimaConexion(ultimaConexion: string | null): string {
  if (ultimaConexion === null) {
    return 'Última conexión: nunca reportada'
  }
  const formatted = new Date(ultimaConexion).toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  return `Última conexión: ${formatted}`
}

function parseOptionalHostIp(value: string): string | null {
  return value === '' ? null : value
}

interface CubaitorCreateFormProps {
  isSubmitting: boolean
  onSubmit: (values: CreateCubaitorFormValues) => void
}

function CubaitorCreateForm({ isSubmitting, onSubmit }: CubaitorCreateFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateCubaitorFormValues>({
    resolver: zodResolver(createCubaitorSchema),
    defaultValues: { nombre: '', mac: '', numPins: 1, hostIp: null },
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
        label="MAC"
        description="Identidad física del dispositivo — no se puede cambiar después."
        required
        error={errors.mac?.message}
      >
        {(controlProps) => (
          <Input
            {...controlProps}
            placeholder="A4:CF:12:9B:3E:01"
            disabled={isSubmitting}
            {...register('mac')}
          />
        )}
      </FormField>
      <FormField label="Número de pines" required error={errors.numPins?.message}>
        {(controlProps) => (
          <Input
            {...controlProps}
            type="number"
            min={1}
            max={16}
            step={1}
            disabled={isSubmitting}
            {...register('numPins', { valueAsNumber: true })}
          />
        )}
      </FormField>
      <FormField
        label="IP del host"
        description="Opcional"
        error={errors.hostIp?.message}
      >
        {(controlProps) => (
          <Input
            {...controlProps}
            placeholder="192.168.1.20"
            disabled={isSubmitting}
            {...register('hostIp', { setValueAs: parseOptionalHostIp })}
          />
        )}
      </FormField>
      <Button type="submit" loading={isSubmitting} className="w-full sm:w-auto">
        Guardar
      </Button>
    </form>
  )
}

interface CubaitorEditFormProps {
  initialValues: UpdateCubaitorFormValues
  isSubmitting: boolean
  onSubmit: (values: UpdateCubaitorFormValues) => void
}

function CubaitorEditForm({
  initialValues,
  isSubmitting,
  onSubmit,
}: CubaitorEditFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateCubaitorFormValues>({
    resolver: zodResolver(updateCubaitorSchema),
    defaultValues: initialValues,
  })

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="flex flex-col gap-4"
    >
      <FormField label="Nombre" error={errors.nombre?.message}>
        {(controlProps) => (
          <Input {...controlProps} disabled={isSubmitting} {...register('nombre')} />
        )}
      </FormField>
      <FormField label="Número de pines" error={errors.numPins?.message}>
        {(controlProps) => (
          <Input
            {...controlProps}
            type="number"
            min={1}
            max={16}
            step={1}
            disabled={isSubmitting}
            {...register('numPins', { valueAsNumber: true })}
          />
        )}
      </FormField>
      <FormField
        label="IP del host"
        description="Opcional"
        error={errors.hostIp?.message}
      >
        {(controlProps) => (
          <Input
            {...controlProps}
            placeholder="192.168.1.20"
            disabled={isSubmitting}
            {...register('hostIp', { setValueAs: parseOptionalHostIp })}
          />
        )}
      </FormField>
      <FormField label="Estado" error={errors.estado?.message}>
        {(controlProps) => (
          <Select {...controlProps} disabled={isSubmitting} {...register('estado')}>
            {CUBAITOR_ESTADOS.map((estado) => (
              <option key={estado} value={estado}>
                {CUBAITOR_ESTADO_LABELS[estado]}
              </option>
            ))}
          </Select>
        )}
      </FormField>
      <Button type="submit" loading={isSubmitting} className="w-full sm:w-auto">
        Guardar
      </Button>
    </form>
  )
}

/**
 * `Bebidas y Cubaitor` global catalog — Cubaitor (device fleet) tab. Real
 * `GET/POST/PUT /cubaitors`, `DELETE /cubaitors/{id}`.
 *
 * Deliberately never renders an "En línea"/"Fuera de línea" indicator: see
 * `formatUltimaConexion` above and `types/cubaitor.ts`'s module comment for
 * why `en_linea`/heartbeat cannot be trusted as a live signal on the pinned
 * backend today.
 */
export function CubaitorFleetSection() {
  const cubaitorsQuery = useCubaitorsQuery()
  const createMutation = useCreateCubaitorMutation()
  const updateMutation = useUpdateCubaitorMutation()
  const deactivateMutation = useDeactivateCubaitorMutation()

  const [dialogMode, setDialogMode] = useState<'closed' | 'create' | number>('closed')
  const [formError, setFormError] = useState<string | undefined>(undefined)
  const [rowError, setRowError] = useState<Record<number, string>>({})

  const editingCubaitor =
    typeof dialogMode === 'number'
      ? (cubaitorsQuery.data?.find((c) => c.idCubaitor === dialogMode) ?? null)
      : null

  function closeDialog() {
    setDialogMode('closed')
    setFormError(undefined)
  }

  function handleCreateSubmit(values: CreateCubaitorFormValues) {
    setFormError(undefined)
    createMutation.mutate(values, {
      onSuccess: closeDialog,
      onError: (error) => setFormError(toSafeErrorMessage(error)),
    })
  }

  function handleEditSubmit(values: UpdateCubaitorFormValues) {
    if (typeof dialogMode !== 'number') {
      return
    }
    setFormError(undefined)
    /**
     * Built with the same conditional-spread convention `menuApi.ts` uses
     * for optional query params, rather than passing `values` straight
     * through: `updateCubaitorSchema`'s fields are all `.optional()` (so
     * their inferred value types explicitly include `| undefined`), which
     * `exactOptionalPropertyTypes` refuses to assign directly to
     * `UpdateCubaitorInput`'s optional-but-never-explicitly-undefined
     * keys. Each spread below only adds the key when the value is
     * actually defined, so the resulting object's keys are always
     * concretely typed.
     */
    updateMutation.mutate(
      {
        idCubaitor: dialogMode,
        input: {
          ...(values.nombre === undefined ? {} : { nombre: values.nombre }),
          ...(values.numPins === undefined ? {} : { numPins: values.numPins }),
          ...(values.hostIp === undefined ? {} : { hostIp: values.hostIp }),
          ...(values.estado === undefined ? {} : { estado: values.estado }),
        },
      },
      {
        onSuccess: closeDialog,
        onError: (error) => setFormError(toSafeErrorMessage(error)),
      },
    )
  }

  function handleDeactivate(idCubaitor: number) {
    setRowError((previous) => {
      const next = { ...previous }
      delete next[idCubaitor]
      return next
    })
    deactivateMutation.mutate(idCubaitor, {
      onError: (error) =>
        setRowError((previous) => ({
          ...previous,
          [idCubaitor]: toSafeErrorMessage(error),
        })),
    })
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Text size="sm" className="text-muted-foreground">
          Flota global de dispositivos Cubaitor, independiente de cualquier evento.
        </Text>
        <Button type="button" onClick={() => setDialogMode('create')}>
          Nuevo dispositivo
        </Button>
      </div>

      {cubaitorsQuery.isPending ? (
        <div
          role="status"
          aria-label="Cargando dispositivos"
          className="flex flex-col gap-3"
        >
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : cubaitorsQuery.isError ? (
        <Alert tone="danger" title="No pudimos cargar los dispositivos">
          <p>{toSafeErrorMessage(cubaitorsQuery.error)}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-2 self-start"
            onClick={() => void cubaitorsQuery.refetch()}
          >
            Reintentar
          </Button>
        </Alert>
      ) : cubaitorsQuery.data.length === 0 ? (
        <div className="border-border rounded-lg border border-dashed p-10 text-center">
          <Text size="sm" className="text-muted-foreground">
            No hay dispositivos registrados todavía.
          </Text>
        </div>
      ) : (
        <ul aria-label="Dispositivos Cubaitor" className="flex flex-col gap-3">
          {cubaitorsQuery.data.map((cubaitor) => (
            <li key={cubaitor.idCubaitor}>
              <Card>
                <CardContent className="flex flex-wrap items-center gap-3 p-4">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Text className="font-medium">{cubaitor.nombre}</Text>
                      <Badge tone={CUBAITOR_ESTADO_TONE[cubaitor.estado]}>
                        {CUBAITOR_ESTADO_LABELS[cubaitor.estado]}
                      </Badge>
                    </div>
                    <Text size="sm" className="text-muted-foreground">
                      <span className="font-mono">{cubaitor.mac}</span>
                      {' · '}
                      {cubaitor.hostIp ?? 'Sin IP'}
                      {' · '}
                      {cubaitor.numPins} {cubaitor.numPins === 1 ? 'pin' : 'pines'}
                    </Text>
                    <Text size="sm" className="text-muted-foreground">
                      {formatUltimaConexion(cubaitor.ultimaConexion)}
                    </Text>
                    {rowError[cubaitor.idCubaitor] ? (
                      <Text size="sm" className="text-destructive">
                        {rowError[cubaitor.idCubaitor]}
                      </Text>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDialogMode(cubaitor.idCubaitor)}
                  >
                    Editar
                  </Button>
                  {cubaitor.estado !== 'inactivo' ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      loading={deactivateMutation.isPending}
                      onClick={() => handleDeactivate(cubaitor.idCubaitor)}
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
        title={
          typeof dialogMode === 'number' ? 'Editar dispositivo' : 'Nuevo dispositivo'
        }
      >
        {formError ? (
          <Alert tone="danger" className="mb-4">
            <p>{formError}</p>
          </Alert>
        ) : null}
        {typeof dialogMode === 'number' ? (
          editingCubaitor ? (
            <CubaitorEditForm
              key={editingCubaitor.idCubaitor}
              initialValues={{
                nombre: editingCubaitor.nombre,
                numPins: editingCubaitor.numPins,
                hostIp: editingCubaitor.hostIp,
                estado: editingCubaitor.estado,
              }}
              isSubmitting={isSubmitting}
              onSubmit={handleEditSubmit}
            />
          ) : null
        ) : (
          <CubaitorCreateForm isSubmitting={isSubmitting} onSubmit={handleCreateSubmit} />
        )}
      </Dialog>
    </div>
  )
}
