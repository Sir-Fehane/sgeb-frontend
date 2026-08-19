import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { EventCreateForm } from '@/features/events/components/EventCreateForm'
import { EventCreateSalonDialog } from '@/features/events/components/EventCreateSalonDialog'
import { useCreateEventoMutation } from '@/features/events/queries/useCreateEventoMutation'
import { useCreateSalonMutation } from '@/features/events/queries/useCreateSalonMutation'
import { useSalonesQuery } from '@/features/events/queries/useSalonesQuery'
import type { EventCreateFormValues } from '@/features/events/schemas/eventCreateSchema'
import type { CreateSalonFormValues } from '@/features/events/schemas/salonCreateSchema'
import type { CreateEventoRequest } from '@/features/events/services/eventsApi'
import {
  clearEventCreateDraft,
  consumeEventCreateDraft,
  saveEventCreateDraft,
} from '@/features/events/utils/eventCreateDraft'
import { buildInicioDateTime } from '@/features/events/utils/eventScheduling'
import { beginAuthorization } from '@/features/oidc-client/protocol/authorizationRequest'
import { useOidcSessionStore } from '@/features/oidc-client/session/sessionStore'
import {
  isSessionExpiredError,
  isSgebApplicationError,
  isSgebNetworkError,
} from '@/shared/api/sgebApiError'
import { Alert, Button, SectionHeading, Spinner, Text, Toast } from '@/shared/components'

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
    inicio: buildInicioDateTime(values.fecha, values.hora_inicio),
    cupoMeseros: values.cupo_meseros,
    numMesas: values.num_mesas,
    tarifaPorMesero: values.tarifa_por_mesero,
    radioGeocercaM: values.radio_geocerca_m,
  }
}

/**
 * The write-side auth-recovery states this page can be in after a
 * `POST /eventos` fails specifically because auth expired AND the normal
 * refresh attempt also failed (`isSessionExpiredError` —
 * `shared/api/sgebApiError.ts`). Never entered for a plain refresh-succeeds
 * expiry (that stays fully transparent, unchanged) or for any other
 * business/validation failure (those keep the plain generic error alert).
 *
 * - `auto-recovering`: the common, desired path — the draft saved
 *   successfully and a silent (`prompt=none`) OIDC round-trip is under way
 *   automatically, with no user click required. Its outcome is discovered
 *   only after the page remounts post-navigation (see the restore-on-mount
 *   logic below); this state itself just covers the brief moment before
 *   that navigation actually takes effect.
 * - `manual-silent-failed`: the silent recovery call itself rejected
 *   synchronously (e.g. broken OIDC config) — degrade to requiring an
 *   explicit click, same primitive, without `prompt: 'none'`.
 * - `manual-draft-not-saved`: sessionStorage itself is unavailable (quota,
 *   private-browsing restrictions, disabled) — per `saveEventCreateDraft`'s
 *   own contract, never navigate away while implying the draft was
 *   preserved when it wasn't; require an explicit click and tell the user
 *   plainly that automatic preservation failed.
 */
type SessionRecoveryState =
  'idle' | 'auto-recovering' | 'manual-silent-failed' | 'manual-draft-not-saved'

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
 *
 * Auth-recovery draft (`utils/eventCreateDraft.ts`): if `POST /eventos`
 * fails because normal token refresh also failed, this page snapshots the
 * typed form and lets the existing silent OIDC recovery run automatically
 * — never a manual click first, since `prompt=none` can often recover the
 * broader SSO session with zero user interaction. It never auto-replays
 * the write itself (no documented idempotency guarantee for `POST
 * /eventos` — see this branch's report), and the restored form never
 * auto-submits — the user always reviews and clicks "Crear evento" again
 * explicitly.
 */
export function EventCreatePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const session = useOidcSessionStore((state) => state.session)

  const salonesQuery = useSalonesQuery()
  const createEventoMutation = useCreateEventoMutation()
  const createSalonMutation = useCreateSalonMutation()

  const [showCreateSalon, setShowCreateSalon] = useState(false)
  const [justCreatedSalonId, setJustCreatedSalonId] = useState<number | undefined>(
    undefined,
  )
  /**
   * Holds the just-created salón's name only long enough to show one
   * floating success `Toast` — cleared the moment the "crear salón" form
   * reopens (a fresh attempt should never sit behind a stale success from
   * a previous one), and by the toast's own manual/auto dismissal. Local,
   * transient UI state, not a query/mutation result:
   * `createSalonMutation.isSuccess` alone can't drive this, since it would
   * stay `true` (and so would a naive render off it) even after the user
   * reopens the form to create a second salón and that attempt is still
   * pending or has failed. Only ever set once `salon.idSalon` has been
   * handed to `EventCreateForm` as `selectedSalonId` below AND
   * `useCreateSalonMutation`'s `onSuccess` has already written that salón
   * into the cached list synchronously (see that hook's own comment) —
   * so by the time this renders, the selection this message claims has
   * genuinely already happened, not merely been requested.
   */
  const [createdSalonName, setCreatedSalonName] = useState<string | null>(null)

  /**
   * Read exactly once, synchronously, at first render — before anything
   * else here can run. `consumeEventCreateDraft` removes the stored draft
   * on this first read regardless of outcome, so even React StrictMode's
   * double-invocation of the initializer in development can't restore (or
   * discard) it twice: the state value itself, not the function call, is
   * what every later render/effect reads from.
   */
  const [restoredDraft] = useState(() => consumeEventCreateDraft())
  const [showRecoveryNotice, setShowRecoveryNotice] = useState(restoredDraft !== null)
  const [sessionRecovery, setSessionRecovery] = useState<SessionRecoveryState>('idle')

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
      setCreatedSalonName(salon.nombre)
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
    setSessionRecovery('idle')
    try {
      const created = await createEventoMutation.mutateAsync(
        toCreateEventoRequest(values, session.user.sub),
      )
      // Clears any stale leftover draft from an earlier, unrelated
      // recovery attempt — this successful create is now the ground truth.
      clearEventCreateDraft()
      // One-time route-state flag, not global state — `EventDetailPage`
      // reads and immediately consumes it (replacing its own history
      // entry) so a direct visit never shows it and a reload can't replay
      // it. See that page's own comment.
      void navigate(`/eventos/${String(created.idEvento)}`, {
        state: { justCreated: true },
      })
    } catch (error) {
      if (isSessionExpiredError(error)) {
        if (saveEventCreateDraft(values)) {
          setSessionRecovery('auto-recovering')
          // Never awaited for its result — a synchronous full-page
          // navigation may already be under way. If the callback later
          // discovers the SSO session is gone too, the existing
          // `retry-visible` mechanism (`protocol/callback.ts`,
          // `AuthCallbackPage`) automatically falls back to a normal,
          // VISIBLE authorization request on its own — no extra handling
          // needed here for that case.
          beginAuthorization({
            prompt: 'none',
            returnTo: `${location.pathname}${location.search}`,
          }).catch(() => {
            // The call itself failed before ever navigating (e.g. broken
            // OIDC config) — the draft is still safely saved; only the
            // automatic half of recovery is unavailable.
            setSessionRecovery('manual-silent-failed')
          })
        } else {
          setSessionRecovery('manual-draft-not-saved')
        }
      }
    } finally {
      isCreatingEventoRef.current = false
    }
  }

  /** Explicit, user-initiated recovery for both `manual-*` states — same visible-authorization primitive `AppShellLayout` uses. */
  function handleManualReauthenticate() {
    void beginAuthorization({ returnTo: `${location.pathname}${location.search}` })
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

      {showRecoveryNotice ? (
        <Toast
          title="Sesión renovada"
          onDismiss={() => {
            setShowRecoveryNotice(false)
          }}
        >
          <p>
            Recuperamos los datos que estabas capturando. Revisa la información y guarda
            el evento nuevamente.
          </p>
        </Toast>
      ) : null}

      {createdSalonName ? (
        <Toast
          title="Salón creado"
          onDismiss={() => {
            setCreatedSalonName(null)
          }}
        >
          <p>{createdSalonName} fue creado y seleccionado para este evento.</p>
        </Toast>
      ) : null}

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
          {salonesQuery.data.length === 0 ? (
            <Alert tone="warning" title="No hay salones disponibles">
              <p>Crea un salón para poder registrar el evento.</p>
            </Alert>
          ) : null}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-fit"
            onClick={() => {
              setShowCreateSalon(true)
              setCreatedSalonName(null)
            }}
          >
            ¿No encuentras tu salón? Crear uno nuevo
          </Button>

          <EventCreateSalonDialog
            open={showCreateSalon}
            onSubmit={handleCreateSalon}
            onCancel={() => {
              setShowCreateSalon(false)
            }}
            isSubmitting={createSalonMutation.isPending}
            {...(createSalonMutation.isError
              ? { errorMessage: toSafeErrorMessage(createSalonMutation.error) }
              : {})}
          />

          {sessionRecovery === 'auto-recovering' ? (
            <Alert tone="neutral" title="Renovando tu sesión">
              <p>Tus cambios no se han perdido. Un momento…</p>
            </Alert>
          ) : sessionRecovery === 'manual-silent-failed' ? (
            <Alert
              tone="warning"
              title="Tu sesión expiró"
              action={
                <Button type="button" size="sm" onClick={handleManualReauthenticate}>
                  Iniciar sesión
                </Button>
              }
            >
              <p>
                Recuperamos los datos que estabas capturando. Vuelve a iniciar sesión.
              </p>
            </Alert>
          ) : sessionRecovery === 'manual-draft-not-saved' ? (
            <Alert
              tone="warning"
              title="Tu sesión expiró"
              action={
                <Button type="button" size="sm" onClick={handleManualReauthenticate}>
                  Iniciar sesión
                </Button>
              }
            >
              <p>
                No pudimos conservar automáticamente los datos para renovar la sesión.
                Copia o revisa la información antes de volver a iniciar sesión.
              </p>
            </Alert>
          ) : createEventoMutation.isError ? (
            <Alert tone="danger" title="No se pudo crear el evento">
              <p>{toSafeErrorMessage(createEventoMutation.error)}</p>
            </Alert>
          ) : null}

          <EventCreateForm
            onSubmit={handleSubmit}
            isSubmitting={createEventoMutation.isPending}
            salones={salonesQuery.data}
            selectedSalonId={
              justCreatedSalonId ??
              (restoredDraft &&
              salonesQuery.data.some((salon) => salon.idSalon === restoredDraft.id_salon)
                ? restoredDraft.id_salon
                : undefined)
            }
            {...(restoredDraft ? { initialValues: restoredDraft } : {})}
          />
        </>
      )}
    </div>
  )
}
