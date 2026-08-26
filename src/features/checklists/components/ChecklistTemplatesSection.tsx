import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'

import {
  useCreateChecklistMutation,
  useDeactivateChecklistMutation,
  useUpdateChecklistMutation,
} from '@/features/checklists/queries/useChecklistMutations'
import { useChecklistsQuery } from '@/features/checklists/queries/useChecklistsQuery'
import {
  CHECKLIST_TIPOS,
  createChecklistSchema,
  type CreateChecklistFormValues,
} from '@/features/checklists/schemas/checklistSchemas'
import type {
  ChecklistTemplateViewModel,
  ChecklistTipo,
} from '@/features/checklists/types/checklists'
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
  type Tone,
} from '@/shared/components'

const CHECKLIST_TIPO_LABELS: Record<ChecklistTipo, string> = {
  montaje: 'Montaje',
  servicio: 'Servicio',
  cierre: 'Cierre',
}

/** Tone conveys nothing about approval/completion — only which of the three template families this is. Text label is always shown alongside, never tone alone. */
const CHECKLIST_TIPO_TONES: Record<ChecklistTipo, Tone> = {
  montaje: 'info',
  servicio: 'neutral',
  cierre: 'neutral',
}

function toSafeErrorMessage(error: unknown): string {
  if (isSgebApplicationError(error) || isSgebNetworkError(error)) {
    return error.message
  }
  return 'Ocurrió un error inesperado.'
}

/** A fresh `useFieldArray` row — new object per call, mirrors `BebidasSection`'s `createEmptyIngredienteRow`. */
function createEmptyItemRow(orden: number): CreateChecklistFormValues['items'][number] {
  return { descripcion: '', cantidadEsperada: 1, orden }
}

interface ChecklistTemplateFormProps {
  initialValues?: CreateChecklistFormValues | undefined
  isSubmitting: boolean
  onSubmit: (values: CreateChecklistFormValues) => void
}

function ChecklistTemplateForm({
  initialValues,
  isSubmitting,
  onSubmit,
}: ChecklistTemplateFormProps) {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateChecklistFormValues>({
    resolver: zodResolver(createChecklistSchema),
    defaultValues: initialValues ?? {
      nombre: '',
      tipo: 'montaje',
      items: [createEmptyItemRow(1)],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

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
            {CHECKLIST_TIPOS.map((tipo) => (
              <option key={tipo} value={tipo}>
                {CHECKLIST_TIPO_LABELS[tipo]}
              </option>
            ))}
          </Select>
        )}
      </FormField>

      {errors.items?.root?.message ? (
        <Alert tone="danger">
          <p>{errors.items.root.message}</p>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-4">
        {fields.map((field, index) => (
          <fieldset
            key={field.id}
            className="border-border flex flex-col gap-4 rounded-lg border p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <legend className="font-sans text-body-sm font-semibold">
                Ítem {index + 1}
              </legend>
              {fields.length > 1 ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isSubmitting}
                  aria-label={`Quitar ítem ${String(index + 1)}`}
                  onClick={() => remove(index)}
                >
                  Quitar
                </Button>
              ) : null}
            </div>

            <FormField
              label={`Descripción ${index + 1}`}
              required
              error={errors.items?.[index]?.descripcion?.message}
            >
              {(controlProps) => (
                <Input
                  {...controlProps}
                  maxLength={80}
                  disabled={isSubmitting}
                  {...register(`items.${index}.descripcion`)}
                />
              )}
            </FormField>

            <FormField
              label={`Cantidad esperada ${index + 1}`}
              required
              error={errors.items?.[index]?.cantidadEsperada?.message}
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
                  {...register(`items.${index}.cantidadEsperada`, {
                    valueAsNumber: true,
                  })}
                />
              )}
            </FormField>

            <FormField
              label={`Orden ${index + 1}`}
              required
              error={errors.items?.[index]?.orden?.message}
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
                  {...register(`items.${index}.orden`, { valueAsNumber: true })}
                />
              )}
            </FormField>
          </fieldset>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-fit"
        disabled={isSubmitting}
        onClick={() => append(createEmptyItemRow(fields.length + 1))}
      >
        Agregar ítem
      </Button>

      <Button type="submit" loading={isSubmitting} className="w-full sm:w-auto">
        Guardar
      </Button>
    </form>
  )
}

function templateToFormValues(
  template: ChecklistTemplateViewModel,
): CreateChecklistFormValues {
  return {
    nombre: template.nombre,
    tipo: template.tipo,
    items: template.items
      .filter((item) => item.activo)
      .map((item) => ({
        descripcion: item.descripcion,
        cantidadEsperada: item.cantidadEsperada,
        orden: item.orden,
      })),
  }
}

/**
 * Global "Checklists" catalog — captain/admin template management (Phase 3).
 * Real `GET/POST/PUT /checklists`, `DELETE /checklists/{id}`. Covers all
 * three template types (`montaje`/`servicio`/`cierre`) identically here;
 * only `montaje` has any downstream effect on mesa assignment, and only
 * inside `features/events/montage` — this screen never treats that as a
 * reason to special-case the other two types' CRUD.
 *
 * Editing/deactivating a template with open instances in a live event is
 * rejected by the backend (`SGEB-4017`/`SGEB-4016`) — surfaced here via the
 * same generic `toSafeErrorMessage` every other catalog form uses, never a
 * fabricated client-side pre-check (no authoritative pre-check endpoint
 * exists).
 */
export function ChecklistTemplatesSection() {
  const checklistsQuery = useChecklistsQuery()
  const createMutation = useCreateChecklistMutation()
  const updateMutation = useUpdateChecklistMutation()
  const deactivateMutation = useDeactivateChecklistMutation()

  const [tipoFilter, setTipoFilter] = useState<ChecklistTipo | 'todos'>('todos')
  const [dialogMode, setDialogMode] = useState<'closed' | 'create' | number>('closed')
  const [formError, setFormError] = useState<string | undefined>(undefined)
  const [rowError, setRowError] = useState<Record<number, string>>({})

  const editingTemplate =
    typeof dialogMode === 'number'
      ? (checklistsQuery.data?.find((c) => c.idChecklist === dialogMode) ?? null)
      : null

  const visibleTemplates = (checklistsQuery.data ?? []).filter(
    (template) => tipoFilter === 'todos' || template.tipo === tipoFilter,
  )

  function closeDialog() {
    setDialogMode('closed')
    setFormError(undefined)
  }

  function handleSubmit(values: CreateChecklistFormValues) {
    setFormError(undefined)
    if (typeof dialogMode === 'number') {
      updateMutation.mutate(
        { idChecklist: dialogMode, input: values },
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

  function handleDeactivate(idChecklist: number) {
    setRowError((previous) => {
      const next = { ...previous }
      delete next[idChecklist]
      return next
    })
    deactivateMutation.mutate(idChecklist, {
      onError: (error) =>
        setRowError((previous) => ({
          ...previous,
          [idChecklist]: toSafeErrorMessage(error),
        })),
    })
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Text size="sm" className="text-muted-foreground">
          Catálogo global de plantillas de checklist (montaje, servicio, cierre).
        </Text>
        <Button type="button" onClick={() => setDialogMode('create')}>
          Nueva plantilla
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={tipoFilter === 'todos' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setTipoFilter('todos')}
        >
          Todos
        </Button>
        {CHECKLIST_TIPOS.map((tipo) => (
          <Button
            key={tipo}
            type="button"
            variant={tipoFilter === tipo ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setTipoFilter(tipo)}
          >
            {CHECKLIST_TIPO_LABELS[tipo]}
          </Button>
        ))}
      </div>

      {checklistsQuery.isPending ? (
        <div
          role="status"
          aria-label="Cargando plantillas"
          className="flex flex-col gap-3"
        >
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      ) : checklistsQuery.isError ? (
        <Alert tone="danger" title="No pudimos cargar las plantillas">
          <p>{toSafeErrorMessage(checklistsQuery.error)}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-2 self-start"
            onClick={() => void checklistsQuery.refetch()}
          >
            Reintentar
          </Button>
        </Alert>
      ) : visibleTemplates.length === 0 ? (
        <div className="border-border rounded-lg border border-dashed p-10 text-center">
          <Text size="sm" className="text-muted-foreground">
            No hay plantillas de checklist registradas todavía.
          </Text>
        </div>
      ) : (
        <ul aria-label="Plantillas de checklist" className="flex flex-col gap-3">
          {visibleTemplates.map((template) => {
            const activeItems = template.items.filter((item) => item.activo)
            return (
              <li key={template.idChecklist}>
                <Card>
                  <CardContent className="flex flex-wrap items-center gap-3 p-4">
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Text className="font-medium">{template.nombre}</Text>
                        {!template.activo ? <Badge tone="neutral">Inactiva</Badge> : null}
                      </div>
                      <Text size="sm" className="text-muted-foreground">
                        {activeItems.length} ítem{activeItems.length === 1 ? '' : 's'}
                      </Text>
                      {rowError[template.idChecklist] ? (
                        <Text size="sm" className="text-destructive">
                          {rowError[template.idChecklist]}
                        </Text>
                      ) : null}
                    </div>
                    <Badge tone={CHECKLIST_TIPO_TONES[template.tipo]}>
                      {CHECKLIST_TIPO_LABELS[template.tipo]}
                    </Badge>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDialogMode(template.idChecklist)}
                    >
                      Editar
                    </Button>
                    {template.activo ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        loading={
                          deactivateMutation.isPending &&
                          deactivateMutation.variables === template.idChecklist
                        }
                        onClick={() => handleDeactivate(template.idChecklist)}
                      >
                        Desactivar
                      </Button>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      <Dialog
        open={dialogMode !== 'closed'}
        onClose={closeDialog}
        title={typeof dialogMode === 'number' ? 'Editar plantilla' : 'Nueva plantilla'}
      >
        {formError ? (
          <Alert tone="danger" className="mb-4">
            <p>{formError}</p>
          </Alert>
        ) : null}
        <ChecklistTemplateForm
          key={typeof dialogMode === 'number' ? dialogMode : 'create'}
          initialValues={
            editingTemplate ? templateToFormValues(editingTemplate) : undefined
          }
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
        />
      </Dialog>
    </div>
  )
}
