import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { EventCreateForm } from '@/features/events/components/EventCreateForm'
import { EventCreateSalonForm } from '@/features/events/components/EventCreateSalonForm'
import { useCreateEventoMutation } from '@/features/events/queries/useCreateEventoMutation'
import { useCreateSalonMutation } from '@/features/events/queries/useCreateSalonMutation'
import { useSalonesQuery } from '@/features/events/queries/useSalonesQuery'
import type { EventCreateFormValues } from '@/features/events/schemas/eventCreateSchema'
import type { CreateSalonFormValues } from '@/features/events/schemas/salonCreateSchema'
import type { CreateEventoRequest } from '@/features/events/services/eventsApi'
import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'
import { isSgebApplicationError, isSgebNetworkError } from '@/shared/api/sgebApiError'
import { Alert, Button, SectionHeading, Spinner, Text } from '@/shared/components'

/** Never renders `technical_message` — same helper as every other page in this feature. */
function toSafeErrorMessage(error: unknown): string {
  if (isSgebApplicationError(error) || isSgebNetworkError(error)) {
    return error.message
  }
  return 'Ocurrió un error inesperado.'
}

/**
 * Combines the form's validated (snake_case-keyed) values with the
 * session-derived `uuidCapitan` into the real, camelCase `POST /eventos`
 * request — see `eventCreateSchema.ts`'s field-name note for why this
 * translation exists at all.
 */
function toCreateEventoRequest(
  values: EventCreateFormValues,
  uuidCapitan: string,
): CreateEventoRequest {
  return {
    idSalon: values.id_salon,
    uuidCapitan,
    titulo: values.titulo,
    tipo: values.tipo,
    fecha: values.fecha,
    horaPresentacion: values.hora_presentacion,
    inicio: values.inicio,
    cupoMeseros: values.cupo_meseros,
    numMesas: values.num_mesas,
    tarifaPorMesero: values.tarifa_por_mesero,
    radioGeocercaM: values.radio_geocerca_m,
  }
}

/**
 * Routed at /eventos/nuevo. Replaces the retired
 * `EventCreateFieldPrototypePage` — this is the real, wired creation flow:
 * `EventCreateForm` (live `GET /salones` options) + the minimal "no
 * encuentro mi salón" fallback (`EventCreateSalonForm`, `POST /salones`)
 * discovered as a hard prerequisite during this branch's reconciliation
 * (the pinned backend has no salón seeder) + the real `POST /eventos`
 * mutation. No optimistic event creation, no automatic publish — the
 * created event lands in its real backend default state (`borrador`) and
 * this page navigates to its real detail page afterward.
 *
 * `uuidCapitan` is the authenticated session's own `sub` claim — self
 * -service captain creation, the only captain-assignment flow this branch
 * implements (see this branch's report for why no captain-picker exists).
 */
export function EventCreatePage() {
  const navigate = useNavigate()
  const session = useOidcSessionStore((state) => state.session)

  const salonesQuery = useSalonesQuery()
  const createEventoMutation = useCreateEventoMutation()
  const createSalonMutation = useCreateSalonMutation()

  const [showCreateSalon, setShowCreateSalon] = useState(false)
  const [justCreatedSalonId, setJustCreatedSalonId] = useState<number | undefined>(
    undefined,
  )

  // A plain ref, not `mutation.isPending` — mirrors `EventClosurePage`'s
  // own `isSubmittingRef`/`isFinalizingRef`: TanStack Query's mutation
  // state updates through its own external store and is not guaranteed to
  // have flushed between two synchronous clicks, unlike a ref (immediate).
  const isCreatingEventoRef = useRef(false)
  const isCreatingSalonRef = useRef(false)

  async function handleCreateSalon(values: CreateSalonFormValues) {
    if (isCreatingSalonRef.current) {
      return
    }
    isCreatingSalonRef.current = true
    try {
      const salon = await createSalonMutation.mutateAsync(values)
      setJustCreatedSalonId(salon.idSalon)
      setShowCreateSalon(false)
    } finally {
      isCreatingSalonRef.current = false
    }
  }

  async function handleSubmit(values: EventCreateFormValues) {
    if (session.status !== 'authenticated' || isCreatingEventoRef.current) {
      return
    }
    isCreatingEventoRef.current = true
    try {
      const created = await createEventoMutation.mutateAsync(
        toCreateEventoRequest(values, session.user.sub),
      )
      void navigate(`/eventos/${String(created.idEvento)}`)
    } finally {
      isCreatingEventoRef.current = false
    }
  }

  if (session.status !== 'authenticated') {
    return (
      <Alert tone="danger" title="Sesión requerida">
        Inicia sesión para crear un evento.
      </Alert>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <SectionHeading className="text-heading">Crear evento</SectionHeading>

      {salonesQuery.isPending ? (
        <div className="flex items-center gap-2">
          <Spinner size="sm" label="Cargando salones" />
          <Text size="sm" className="text-muted-foreground">
            Cargando salones…
          </Text>
        </div>
      ) : salonesQuery.isError ? (
        <Alert tone="danger" title="No pudimos cargar los salones">
          <p>{toSafeErrorMessage(salonesQuery.error)}</p>
        </Alert>
      ) : (
        <>
          {salonesQuery.data.length === 0 && !showCreateSalon ? (
            <Alert tone="warning" title="No hay salones disponibles">
              <p>Crea un salón para poder registrar el evento.</p>
            </Alert>
          ) : null}

          {showCreateSalon ? (
            <EventCreateSalonForm
              onSubmit={handleCreateSalon}
              onCancel={() => {
                setShowCreateSalon(false)
              }}
              isSubmitting={createSalonMutation.isPending}
              {...(createSalonMutation.isError
                ? { errorMessage: toSafeErrorMessage(createSalonMutation.error) }
                : {})}
            />
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => {
                setShowCreateSalon(true)
              }}
            >
              ¿No encuentras tu salón? Crear uno nuevo
            </Button>
          )}

          {createEventoMutation.isError ? (
            <Alert tone="danger" title="No se pudo crear el evento">
              <p>{toSafeErrorMessage(createEventoMutation.error)}</p>
            </Alert>
          ) : null}

          <EventCreateForm
            onSubmit={handleSubmit}
            isSubmitting={createEventoMutation.isPending}
            salones={salonesQuery.data}
            selectedSalonId={justCreatedSalonId}
          />
        </>
      )}
    </div>
  )
}
