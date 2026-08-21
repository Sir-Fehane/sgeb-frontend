import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { useCubaitorsQuery } from '@/features/cubaitor/queries/useCubaitorsQuery'
import {
  useCreateConfigDispensadoMutation,
  useDeactivateConfigDispensadoMutation,
  useRecargarConfigDispensadoMutation,
  useUpdateConfigDispensadoMutation,
} from '@/features/events/cubaitor/queries/useConfigDispensadoMutations'
import { useConfigDispensadoQuery } from '@/features/events/cubaitor/queries/useConfigDispensadoQuery'
import {
  createConfigDispensadoSchema,
  recalibrarConfigDispensadoSchema,
  recargaSchema,
  type CreateConfigDispensadoFormValues,
  type RecalibrarConfigDispensadoFormValues,
  type RecargaFormValues,
} from '@/features/events/cubaitor/schemas/eventCubaitorSchemas'
import type { ConfigDispensadoViewModel } from '@/features/events/cubaitor/types/eventCubaitor'
import { useInsumosQuery } from '@/features/menu/queries/useInsumosQuery'
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

function toSafeErrorMessage(error: unknown): string {
  if (isSgebApplicationError(error) || isSgebNetworkError(error)) {
    return error.message
  }
  return 'Ocurrió un error inesperado.'
}

interface ConfigFormProps {
  cubaitors: readonly { idCubaitor: number; nombre: string }[]
  insumos: readonly { idInsumo: number; nombre: string }[]
  isSubmitting: boolean
  onSubmit: (values: CreateConfigDispensadoFormValues) => void
}

function ConfigForm({ cubaitors, insumos, isSubmitting, onSubmit }: ConfigFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateConfigDispensadoFormValues>({
    resolver: zodResolver(createConfigDispensadoSchema),
    defaultValues: {
      idCubaitor: cubaitors[0]?.idCubaitor ?? 0,
      idInsumo: insumos[0]?.idInsumo ?? 0,
      pinGpio: 0,
      caudalMlSeg: 1,
      volumenCargadoMl: 1000,
    },
  })

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="flex flex-col gap-4"
    >
      <FormField label="Cubaitor" required error={errors.idCubaitor?.message}>
        {(controlProps) => (
          <Select
            {...controlProps}
            disabled={isSubmitting}
            {...register('idCubaitor', { valueAsNumber: true })}
          >
            {cubaitors.map((c) => (
              <option key={c.idCubaitor} value={c.idCubaitor}>
                {c.nombre}
              </option>
            ))}
          </Select>
        )}
      </FormField>
      <FormField label="Insumo" required error={errors.idInsumo?.message}>
        {(controlProps) => (
          <Select
            {...controlProps}
            disabled={isSubmitting}
            {...register('idInsumo', { valueAsNumber: true })}
          >
            {insumos.map((i) => (
              <option key={i.idInsumo} value={i.idInsumo}>
                {i.nombre}
              </option>
            ))}
          </Select>
        )}
      </FormField>
      <FormField
        label="Pin GPIO"
        description="0–39"
        required
        error={errors.pinGpio?.message}
      >
        {(controlProps) => (
          <Input
            {...controlProps}
            type="number"
            min={0}
            max={39}
            disabled={isSubmitting}
            {...register('pinGpio', { valueAsNumber: true })}
          />
        )}
      </FormField>
      <FormField
        label="Caudal calibrado (ml/seg)"
        required
        error={errors.caudalMlSeg?.message}
      >
        {(controlProps) => (
          <Input
            {...controlProps}
            type="number"
            min={0.01}
            max={999.99}
            step="0.01"
            disabled={isSubmitting}
            {...register('caudalMlSeg', { valueAsNumber: true })}
          />
        )}
      </FormField>
      <FormField
        label="Volumen cargado (ml)"
        required
        error={errors.volumenCargadoMl?.message}
      >
        {(controlProps) => (
          <Input
            {...controlProps}
            type="number"
            min={1}
            max={65535}
            disabled={isSubmitting}
            {...register('volumenCargadoMl', { valueAsNumber: true })}
          />
        )}
      </FormField>
      <Button type="submit" loading={isSubmitting} className="w-full sm:w-auto">
        Configurar pin
      </Button>
    </form>
  )
}

function RecargaForm({
  isSubmitting,
  onSubmit,
}: {
  isSubmitting: boolean
  onSubmit: (values: RecargaFormValues) => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RecargaFormValues>({
    resolver: zodResolver(recargaSchema),
    defaultValues: { volumenCargadoMl: 1000 },
  })

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="flex flex-col gap-4"
    >
      <FormField
        label="Volumen cargado (ml)"
        description="La nueva botella completa — reactiva las órdenes pausadas esperando este insumo."
        required
        error={errors.volumenCargadoMl?.message}
      >
        {(controlProps) => (
          <Input
            {...controlProps}
            type="number"
            min={1}
            max={65535}
            disabled={isSubmitting}
            {...register('volumenCargadoMl', { valueAsNumber: true })}
          />
        )}
      </FormField>
      <Button type="submit" loading={isSubmitting} className="w-full sm:w-auto">
        Registrar recarga
      </Button>
    </form>
  )
}

function RecalibrarForm({
  initialCaudalMlSeg,
  isSubmitting,
  onSubmit,
}: {
  initialCaudalMlSeg: number
  isSubmitting: boolean
  onSubmit: (values: RecalibrarConfigDispensadoFormValues) => void
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RecalibrarConfigDispensadoFormValues>({
    resolver: zodResolver(recalibrarConfigDispensadoSchema),
    defaultValues: { caudalMlSeg: initialCaudalMlSeg },
  })

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      className="flex flex-col gap-4"
    >
      <FormField
        label="Caudal calibrado (ml/seg)"
        description="No modifica el volumen disponible — para eso está Recargar."
        required
        error={errors.caudalMlSeg?.message}
      >
        {(controlProps) => (
          <Input
            {...controlProps}
            type="number"
            min={0.01}
            max={999.99}
            step="0.01"
            disabled={isSubmitting}
            {...register('caudalMlSeg', { valueAsNumber: true })}
          />
        )}
      </FormField>
      <Button type="submit" loading={isSubmitting} className="w-full sm:w-auto">
        Guardar calibración
      </Button>
    </form>
  )
}

/** Event-scoped pin configuration — `GET/POST /eventos/{id}/config-dispensado` + recarga. References the GLOBAL Cubaitor/Insumo catalogs for selection, never re-implements their CRUD (task §4/§21). */
export function ConfigDispensadoSection({ idEvento }: { idEvento: number | null }) {
  const configQuery = useConfigDispensadoQuery(idEvento)
  const cubaitorsQuery = useCubaitorsQuery()
  const insumosQuery = useInsumosQuery()
  const createMutation = useCreateConfigDispensadoMutation(idEvento ?? -1)
  const updateMutation = useUpdateConfigDispensadoMutation(idEvento ?? -1)
  const deactivateMutation = useDeactivateConfigDispensadoMutation(idEvento ?? -1)
  const recargaMutation = useRecargarConfigDispensadoMutation(idEvento ?? -1)

  const [createOpen, setCreateOpen] = useState(false)
  const [recargaTarget, setRecargaTarget] = useState<number | null>(null)
  const [recalibrarTarget, setRecalibrarTarget] =
    useState<ConfigDispensadoViewModel | null>(null)
  const [formError, setFormError] = useState<string | undefined>(undefined)
  const [rowError, setRowError] = useState<Record<number, string>>({})

  const cubaitorNombreById = new Map(
    (cubaitorsQuery.data ?? []).map((c) => [c.idCubaitor, c.nombre]),
  )
  const insumoNombreById = new Map(
    (insumosQuery.data ?? []).map((i) => [i.idInsumo, i.nombre]),
  )

  function handleCreate(values: CreateConfigDispensadoFormValues) {
    setFormError(undefined)
    createMutation.mutate(values, {
      onSuccess: () => setCreateOpen(false),
      onError: (error) => setFormError(toSafeErrorMessage(error)),
    })
  }

  function handleRecarga(values: RecargaFormValues) {
    if (recargaTarget === null) {
      return
    }
    setFormError(undefined)
    recargaMutation.mutate(
      { idConfig: recargaTarget, volumenCargadoMl: values.volumenCargadoMl },
      {
        onSuccess: () => setRecargaTarget(null),
        onError: (error) => setFormError(toSafeErrorMessage(error)),
      },
    )
  }

  function handleDeactivate(config: ConfigDispensadoViewModel) {
    setRowError((previous) => {
      const next = { ...previous }
      delete next[config.idConfig]
      return next
    })
    deactivateMutation.mutate(config.idConfig, {
      onError: (error) =>
        setRowError((previous) => ({
          ...previous,
          [config.idConfig]: toSafeErrorMessage(error),
        })),
    })
  }

  function handleRecalibrar(values: RecalibrarConfigDispensadoFormValues) {
    if (recalibrarTarget === null) {
      return
    }
    setFormError(undefined)
    updateMutation.mutate(
      { idConfig: recalibrarTarget.idConfig, input: { caudalMlSeg: values.caudalMlSeg } },
      {
        onSuccess: () => setRecalibrarTarget(null),
        onError: (error) => setFormError(toSafeErrorMessage(error)),
      },
    )
  }

  const isLoading =
    configQuery.isPending || cubaitorsQuery.isPending || insumosQuery.isPending
  const loadError = configQuery.error ?? cubaitorsQuery.error ?? insumosQuery.error

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Text size="sm" className="text-muted-foreground">
          Qué pin del Cubaitor dispensa qué insumo, con qué calibración, en este evento.
        </Text>
        <Button
          type="button"
          disabled={
            (cubaitorsQuery.data?.length ?? 0) === 0 ||
            (insumosQuery.data?.length ?? 0) === 0
          }
          onClick={() => setCreateOpen(true)}
        >
          Configurar pin
        </Button>
      </div>

      {isLoading ? (
        <div
          role="status"
          aria-label="Cargando configuración"
          className="flex flex-col gap-3"
        >
          {Array.from({ length: 2 }, (_, index) => (
            <Skeleton key={index} className="h-20 w-full" />
          ))}
        </div>
      ) : loadError ? (
        <Alert tone="danger" title="No pudimos cargar la configuración">
          <p>{toSafeErrorMessage(loadError)}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-2 self-start"
            onClick={() => {
              void configQuery.refetch()
              void cubaitorsQuery.refetch()
              void insumosQuery.refetch()
            }}
          >
            Reintentar
          </Button>
        </Alert>
      ) : (configQuery.data?.length ?? 0) === 0 ? (
        <div className="border-border rounded-lg border border-dashed p-10 text-center">
          <Text size="sm" className="text-muted-foreground">
            Ningún pin configurado todavía para este evento.
          </Text>
        </div>
      ) : (
        <ul aria-label="Configuración de dispensado" className="flex flex-col gap-3">
          {(configQuery.data ?? []).map((config) => {
            const porcentaje =
              config.volumenCargadoMl > 0
                ? Math.round((config.volumenDisponibleMl / config.volumenCargadoMl) * 100)
                : 0
            return (
              <li key={config.idConfig}>
                <Card>
                  <CardContent className="flex flex-wrap items-center gap-3 p-4">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <Text className="font-medium">
                        Pin {config.pinGpio} —{' '}
                        {cubaitorNombreById.get(config.idCubaitor) ??
                          `Cubaitor ${String(config.idCubaitor)}`}
                      </Text>
                      <Text size="sm" className="text-muted-foreground">
                        {insumoNombreById.get(config.idInsumo) ??
                          `Insumo ${String(config.idInsumo)}`}
                        {' · '}
                        {config.caudalMlSeg} ml/seg · {config.volumenDisponibleMl}/
                        {config.volumenCargadoMl} ml ({porcentaje}%)
                      </Text>
                      {rowError[config.idConfig] ? (
                        <Text size="sm" className="text-destructive">
                          {rowError[config.idConfig]}
                        </Text>
                      ) : null}
                    </div>
                    <Badge
                      tone={
                        porcentaje <= 0
                          ? 'danger'
                          : porcentaje <= 15
                            ? 'warning'
                            : 'success'
                      }
                    >
                      {porcentaje}% disponible
                    </Badge>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setRecalibrarTarget(config)}
                    >
                      Recalibrar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setRecargaTarget(config.idConfig)}
                    >
                      Recargar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      loading={deactivateMutation.isPending}
                      onClick={() => handleDeactivate(config)}
                    >
                      Quitar
                    </Button>
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Configurar pin"
      >
        {formError ? (
          <Alert tone="danger" className="mb-4">
            <p>{formError}</p>
          </Alert>
        ) : null}
        <ConfigForm
          cubaitors={cubaitorsQuery.data ?? []}
          insumos={insumosQuery.data ?? []}
          isSubmitting={createMutation.isPending}
          onSubmit={handleCreate}
        />
      </Dialog>

      <Dialog
        open={recargaTarget !== null}
        onClose={() => setRecargaTarget(null)}
        title="Registrar recarga de botella"
      >
        {formError ? (
          <Alert tone="danger" className="mb-4">
            <p>{formError}</p>
          </Alert>
        ) : null}
        <RecargaForm isSubmitting={recargaMutation.isPending} onSubmit={handleRecarga} />
      </Dialog>

      <Dialog
        open={recalibrarTarget !== null}
        onClose={() => setRecalibrarTarget(null)}
        title="Recalibrar pin"
      >
        {formError ? (
          <Alert tone="danger" className="mb-4">
            <p>{formError}</p>
          </Alert>
        ) : null}
        {recalibrarTarget ? (
          <RecalibrarForm
            key={recalibrarTarget.idConfig}
            initialCaudalMlSeg={recalibrarTarget.caudalMlSeg}
            isSubmitting={updateMutation.isPending}
            onSubmit={handleRecalibrar}
          />
        ) : null}
      </Dialog>
    </div>
  )
}
