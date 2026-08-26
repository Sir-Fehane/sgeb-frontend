import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo } from 'react'
import { useForm, useWatch } from 'react-hook-form'

import { EventGeofenceMapPreview } from '@/features/events/components/EventGeofenceMapPreview'
import { EventGeofenceRadiusField } from '@/features/events/components/EventGeofenceRadiusField'
import { EventTimeField } from '@/features/events/components/EventTimeField'
import {
  createEventFormSchema,
  DEFAULT_RADIO_GEOCERCA_SUGGESTION_M,
  type EventCreateFormValues,
} from '@/features/events/schemas/eventCreateSchema'
import type { EventSalonOption } from '@/features/events/types/event'
import { getTodayIsoDate } from '@/features/events/utils/eventScheduling'
import {
  Button,
  FormField,
  Input,
  SectionHeading,
  Select,
  Text,
} from '@/shared/components'

export interface EventCreateFormProps {
  /**
   * May reject (e.g. a business-rule error from the real `POST /eventos`)
   * — this form's own `submit` wrapper catches that and leaves the fields
   * as the user left them, rather than resetting, so the caller's own
   * error UI (`EventCreatePage`'s mutation error state) stays the single
   * source of truth for what went wrong. Mirrors
   * `EventClosureWasteForm`'s established `onSubmit` contract.
   */
  onSubmit: (values: EventCreateFormValues) => Promise<void>
  isSubmitting?: boolean
  /** Live `GET /salones?activo=true` options — see `EventCreatePage`. */
  salones: readonly EventSalonOption[]
  /**
   * Auto-selects this salón id once it becomes available — used by
   * `EventCreatePage` both to select the salón just created through
   * `EventCreateSalonForm`'s inline fallback, and to restore a salón from
   * an auth-recovery draft (`utils/eventCreateDraft.ts`) once the live
   * `salones` list confirms it's still available, without the caller
   * reaching into this form's internal RHF state.
   */
  selectedSalonId?: number | undefined
  /**
   * Pre-fills every field except `id_salon` — used by `EventCreatePage` to
   * restore an auth-recovery draft (`utils/eventCreateDraft.ts`) after a
   * silent/interactive OIDC round-trip. `id_salon` is deliberately stripped
   * out below even though the type accepts a full `EventCreateFormValues`
   * (the simplest shape for the caller, which already has one — a full,
   * already-consumed draft) — that field depends on the async `salones`
   * list and is handled exclusively through `selectedSalonId` above, so a
   * stale/no-longer-available salón id can never end up silently applied
   * here. Applied once, as RHF's own `defaultValues` at first render —
   * never reactively re-applied on a later prop change, and never triggers
   * a submit by itself.
   */
  initialValues?: Partial<EventCreateFormValues>
}

/**
 * The real `POST /eventos` field set (see `eventCreateSchema.ts`), wired
 * by `EventCreatePage` to the live salón list and the create mutation.
 *
 * `uuid_capitan` is intentionally absent as a form field — it is resolved
 * from the authenticated session, not typed in; see
 * `eventCreateSchema.ts`'s comment. Comanda is absent for a settled
 * reason: the real contract never declares it at creation at all
 * (`docs/decisions.md` ADR-007; `openapi-sgeb.yaml`'s own `EventoCrear`
 * description) — it is uploaded afterward, from Event Detail
 * (`EventDetailComandaSection`), via a dedicated
 * `POST /eventos/{id}/comanda`.
 */
export function EventCreateForm({
  onSubmit,
  isSubmitting = false,
  salones,
  selectedSalonId,
  initialValues,
}: EventCreateFormProps) {
  const schema = useMemo(() => createEventFormSchema(salones), [salones])
  // `id_salon` is never applied from `initialValues` — see that prop's own
  // comment. Stripped here, at the single point of consumption, so it's
  // impossible for a caller's full `EventCreateFormValues` object (e.g. an
  // already-consumed draft) to leak a stale salón id in regardless of what
  // the prop's type otherwise allows.
  const { id_salon: _restoredIdSalon, ...initialValuesWithoutSalon } = initialValues ?? {}

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<EventCreateFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      titulo: '',
      fecha: '',
      hora_presentacion: '',
      hora_inicio: '',
      // 150m is a frontend-only panel suggestion (openapi-sgeb.yaml v1.12.0's
      // `EventoCrear.radio_geocerca_m` description: "Obligatorio, sin valor
      // por defecto... Referencia para el panel: 150 m cubre un salón
      // típico") — the backend has no default at all. Visible, editable,
      // never hidden; a restored draft's own value (below) still wins.
      radio_geocerca_m: DEFAULT_RADIO_GEOCERCA_SUGGESTION_M,
      ...initialValuesWithoutSalon,
    },
  })

  useEffect(() => {
    if (selectedSalonId !== undefined) {
      setValue('id_salon', selectedSalonId, { shouldValidate: true })
    }
  }, [selectedSalonId, setValue])

  /**
   * `useWatch` (scoped to these two fields), not `methods.watch()` in the
   * render body — the geofence preview subtree below is heavier than a
   * plain input, so subscribing broadly (which re-renders this whole form
   * on every keystroke of ANY field, a documented RHF gotcha) would redo
   * that work on every unrelated keystroke (título, fecha, tarifa, ...)
   * too. Scoped `useWatch` only re-renders when `id_salon`/
   * `radio_geocerca_m` themselves change.
   */
  const watchedSalonId = useWatch({ control, name: 'id_salon' })
  const watchedRadioGeocercaM = useWatch({ control, name: 'radio_geocerca_m' })

  /**
   * Resolves the selected salón's coordinates straight from the `salones`
   * list this form already received as a prop (`EventCreatePage`'s live
   * `GET /salones?activo=true`, now carrying `latitud`/`longitud` — see
   * `mapSalonToOption`'s own comment) — never a second fetch, and reuses
   * whatever TanStack Query cache that list already came from.
   */
  const selectedSalon = salones.find((salon) => salon.idSalon === watchedSalonId) ?? null

  async function submit(values: EventCreateFormValues) {
    try {
      await onSubmit(values)
    } catch {
      // The caller's own error UI (`EventCreatePage`'s mutation error
      // state) already surfaces what went wrong — this form just leaves
      // the fields exactly as the user left them, so they can fix and
      // resubmit rather than losing their input to a false reset.
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void handleSubmit(submit)(event)}
      className="flex flex-col gap-6"
    >
      <section className="flex flex-col gap-4">
        <SectionHeading>Información general</SectionHeading>
        <FormField label="Título" required error={errors.titulo?.message}>
          {(controlProps) => (
            <Input
              {...controlProps}
              maxLength={120}
              disabled={isSubmitting}
              {...register('titulo')}
            />
          )}
        </FormField>
        <FormField label="Tipo de evento" required error={errors.tipo?.message}>
          {(controlProps) => (
            <Select {...controlProps} disabled={isSubmitting} {...register('tipo')}>
              <option value="">Selecciona un tipo</option>
              <option value="social">Social</option>
              <option value="empresarial">Empresarial</option>
            </Select>
          )}
        </FormField>
        <FormField label="Salón" required error={errors.id_salon?.message}>
          {(controlProps) => (
            <Select
              {...controlProps}
              disabled={isSubmitting}
              {...register('id_salon', { valueAsNumber: true })}
            >
              <option value="">Selecciona un salón</option>
              {salones.map((salon) => (
                <option key={salon.idSalon} value={salon.idSalon}>
                  {salon.nombre} (máx. {salon.capacidadMaxMesas} mesas)
                </option>
              ))}
            </Select>
          )}
        </FormField>
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeading>Programación</SectionHeading>
        <FormField label="Fecha del evento" required error={errors.fecha?.message}>
          {(controlProps) => (
            <Input
              {...controlProps}
              type="date"
              min={getTodayIsoDate()}
              disabled={isSubmitting}
              {...register('fecha')}
            />
          )}
        </FormField>
        <EventTimeField
          label="Hora de presentación del personal"
          disabled={isSubmitting}
          error={errors.hora_presentacion?.message}
          registration={register('hora_presentacion')}
        />
        <EventTimeField
          label="Hora de inicio del evento"
          disabled={isSubmitting}
          error={errors.hora_inicio?.message}
          registration={register('hora_inicio')}
        />
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeading>Operación</SectionHeading>
        <FormField label="Cupo de meseros" required error={errors.cupo_meseros?.message}>
          {(controlProps) => (
            <Input
              {...controlProps}
              type="number"
              numeric="integer"
              disabled={isSubmitting}
              {...register('cupo_meseros', { valueAsNumber: true })}
            />
          )}
        </FormField>
        <FormField label="Número de mesas" required error={errors.num_mesas?.message}>
          {(controlProps) => (
            <Input
              {...controlProps}
              type="number"
              numeric="integer"
              disabled={isSubmitting}
              {...register('num_mesas', { valueAsNumber: true })}
            />
          )}
        </FormField>
        <FormField
          label="Tarifa por mesero (MXN)"
          required
          error={errors.tarifa_por_mesero?.message}
        >
          {(controlProps) => (
            <Input
              {...controlProps}
              type="number"
              numeric="decimal"
              step="0.01"
              disabled={isSubmitting}
              {...register('tarifa_por_mesero', { valueAsNumber: true })}
            />
          )}
        </FormField>
        <EventGeofenceRadiusField
          disabled={isSubmitting}
          error={errors.radio_geocerca_m?.message}
          registration={register('radio_geocerca_m', { valueAsNumber: true })}
        />
        <EventGeofenceMapPreview
          salon={
            selectedSalon
              ? {
                  nombre: selectedSalon.nombre,
                  lat: selectedSalon.latitud,
                  lng: selectedSalon.longitud,
                }
              : null
          }
          radiusMeters={watchedRadioGeocercaM}
        />
      </section>

      <section className="flex flex-col gap-4">
        <SectionHeading>Capitán responsable</SectionHeading>
        <Text size="sm" className="text-muted-foreground">
          Este evento quedará a tu nombre, a partir de tu sesión iniciada.
        </Text>
      </section>

      <Button type="submit" loading={isSubmitting} className="w-full sm:w-auto">
        Crear evento
      </Button>
    </form>
  )
}
