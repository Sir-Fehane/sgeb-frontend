import { IconFileText, IconTrash, IconUpload } from '@tabler/icons-react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'

import { EventDetailSection } from '@/features/events/components/EventDetailSection'
import type { ComandaMetadataViewModel } from '@/features/events/types/comanda'
import {
  ACCEPTED_COMANDA_MIME_TYPES,
  validateComandaFile,
} from '@/features/events/utils/comandaFileValidation'
import {
  formatComandaFileSize,
  formatComandaMimeType,
} from '@/features/events/utils/comandaFormatting'
import { formatEventDateTime } from '@/features/events/utils/eventDetailFormatting'
import { isSgebApplicationError, isSgebNetworkError } from '@/shared/api/sgebApiError'
import {
  Alert,
  Button,
  FormField,
  Input,
  Spinner,
  Text,
  Toast,
} from '@/shared/components'

export interface EventDetailComandaSectionProps {
  /**
   * Identifies the event this section belongs to — used only to reset this
   * section's own local, transient UI state (upload/retire success
   * messages) when the caller reuses this component instance across a
   * different event, since React Router does not remount
   * `EventDetailPage` on an id-only param change. Never sent to the
   * network from here (the real requests are already scoped by
   * `onUpload`/`onRetire`'s own closures).
   */
  idEvento: number
  /** `null` means no active comanda for this event — a legitimate empty state, not a loading gap. */
  comanda: ComandaMetadataViewModel | null
  isLoading: boolean
  /** A real metadata-read failure (never "no active comanda" — that is `comanda: null`). */
  errorMessage?: string
  /**
   * UX-only visibility gate, sourced from the current authenticated
   * session's role (`capitan`/`admin`) — never a security boundary. The
   * pinned backend has a confirmed gap: `subir`/`retirar`/`restaurar`
   * check role only, never that the caller owns this specific event
   * (see this branch's reconciliation report). Hiding these controls for
   * a `mesero` is a genuine UX improvement; it does not and cannot
   * compensate for that gap, and any `SGEB-1004` the backend still
   * returns is handled like any other error below, not specially.
   */
  canManage: boolean
  /**
   * One-shot open/view action. Receives a fresh `AbortSignal` and the
   * already-open `tab` (or `null` if the browser refused even that) per
   * click — see `handleOpenClick` below and
   * `queries/useOpenComandaMutation.ts` for why the tab must already
   * exist before this is called, never opened inside it.
   */
  onOpen: (signal: AbortSignal, tab: Window | null) => Promise<void>
  onUpload: (file: File) => Promise<void>
  onRetire: () => Promise<void>
}

/** One floating `Toast`'s worth of copy for whichever comanda mutation most recently succeeded. */
interface ComandaFeedback {
  title: string
  body: string
}

/**
 * Opens a blank tab and severs its `opener` reference — the
 * `window.open`-then-navigate-later equivalent of an `<a target="_blank"
 * rel="noopener">` link. Deliberately NOT `window.open(url, '_blank',
 * 'noopener')`: passing the `noopener`/`noreferrer` window-features string
 * makes `window.open` return `null` (per spec, so the opener can never
 * reach into a `noopener` popup) — but `handleOpenClick` needs to hold
 * onto this reference to navigate it once the real URL is known,
 * asynchronously. Setting `.opener = null` on the returned window achieves
 * the identical reverse-tabnabbing protection (the new tab can never read
 * `window.opener` to reach back into this page) without losing the
 * reference.
 */
function openBlankTab(): Window | null {
  const tab = window.open('', '_blank')
  if (tab) {
    tab.opener = null
  }
  return tab
}

/** Duplicated locally rather than shared — same precedent `EventDetailPage`/`EventClosurePage`/`EventPaymentsPage` each already established (CLAUDE.md prefers this over a premature cross-page abstraction). Never renders `result.technical_message`. */
function toSafeErrorMessage(error: unknown): string {
  if (isSgebApplicationError(error) || isSgebNetworkError(error)) {
    return error.message
  }
  return 'Ocurrió un error inesperado.'
}

/**
 * Live Comanda section — read metadata, safe open/view, upload, replace,
 * retire. Rebuilt from scratch against the real 5-endpoint contract (only
 * the first four operations are in scope this branch; history/restore are
 * deliberately deferred — see `docs/decisions.md` ADR-007 and this
 * branch's report). Every pending/error state below is LOCAL to this
 * section (mirrors `EventPaymentRow`'s self-contained
 * pending/error handling), not threaded through `EventDetailContent` as
 * separate props — each of the three actions here is a single, per-section
 * action, not a per-row one, but the underlying network call (upload,
 * retire, open) can independently succeed or fail without blocking the
 * rest of Event Detail, so this section owns its own loading/error
 * presentation instead of folding into the whole page's `isLoading`/
 * `errorMessage` the way `EventClosurePage`/`EventPaymentsPage` fold ALL
 * of their queries together (those pages ARE their one resource; Event
 * Detail is a multi-section overview where Comanda is only one of many).
 */
export function EventDetailComandaSection({
  idEvento,
  comanda,
  isLoading,
  errorMessage,
  canManage,
  onOpen,
  onUpload,
  onRetire,
}: EventDetailComandaSectionProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileValidationError, setFileValidationError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadInputKey, setUploadInputKey] = useState(0)

  const [isOpening, setIsOpening] = useState(false)
  const [openError, setOpenError] = useState<string | null>(null)
  const openControllerRef = useRef<AbortController | null>(null)
  const openTabRef = useRef<Window | null>(null)

  const [confirmingRetire, setConfirmingRetire] = useState(false)
  const [isRetiring, setIsRetiring] = useState(false)
  const [retireError, setRetireError] = useState<string | null>(null)

  /**
   * Whichever comanda mutation most recently succeeded — a single slot,
   * not one per action, since only one floating `Toast` is ever shown at
   * once (see `Toast`'s own comment: this component owns showing/hiding
   * exactly one). Cleared at the START of every new upload/retire attempt
   * (so a later failure never leaves the previous success visible) and by
   * the toast's own manual/auto dismissal.
   */
  const [comandaFeedback, setComandaFeedback] = useState<ComandaFeedback | null>(null)

  useEffect(() => {
    return () => {
      openControllerRef.current?.abort()
      if (openTabRef.current && !openTabRef.current.closed) {
        openTabRef.current.close()
      }
    }
  }, [])

  // This component instance can be reused across different events (Event
  // Detail does not remount on an id-only route change) — clears any
  // success feedback so a real action on THIS event can never be read as
  // leftover confirmation from a previously viewed one. Adjusted during
  // render (React's documented pattern for resetting state on a prop
  // change: https://react.dev/learn/you-might-not-need-an-effect), not in
  // an effect — an effect would run one render late, letting the stale
  // message flash before clearing.
  const [renderedForIdEvento, setRenderedForIdEvento] = useState(idEvento)
  if (idEvento !== renderedForIdEvento) {
    setRenderedForIdEvento(idEvento)
    setComandaFeedback(null)
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    setUploadError(null)
    setComandaFeedback(null)
    if (!file) {
      setSelectedFile(null)
      setFileValidationError(null)
      return
    }
    const validationMessage = validateComandaFile(file)
    setFileValidationError(validationMessage)
    setSelectedFile(validationMessage ? null : file)
  }

  async function handleUploadClick() {
    if (!selectedFile || isUploading) {
      return
    }
    // Captured before the request: `comanda` reflects the pre-upload state,
    // so the success message can honestly distinguish a first upload from
    // a replace even though the real backend has one endpoint for both.
    const wasReplacing = comanda !== null
    setIsUploading(true)
    setUploadError(null)
    setComandaFeedback(null)
    try {
      await onUpload(selectedFile)
      setSelectedFile(null)
      // Remounts the native file input so its own internal value resets —
      // a controlled `value` isn't possible on `type="file"`.
      setUploadInputKey((key) => key + 1)
      setComandaFeedback(
        wasReplacing
          ? {
              title: 'Comanda reemplazada',
              body: 'La nueva comanda se guardó correctamente.',
            }
          : { title: 'Comanda subida', body: 'La comanda se guardó correctamente.' },
      )
    } catch (error) {
      setUploadError(toSafeErrorMessage(error))
    } finally {
      setIsUploading(false)
    }
  }

  async function handleOpenClick() {
    if (isOpening) {
      return
    }
    openControllerRef.current?.abort()
    // A still-open tab from a superseded previous click (not a fetch
    // failure — that case is closed by `openComanda` itself) shouldn't be
    // left stranded blank.
    if (openTabRef.current && !openTabRef.current.closed) {
      openTabRef.current.close()
    }

    // MUST happen synchronously, as the very next statement after the
    // click — this is what keeps `window.open` inside the browser's
    // "transient user activation" window. Everything after this point is
    // async (network requests), and a `window.open` call made after an
    // `await` is unreliable and commonly popup-blocked. See
    // `queries/useOpenComandaMutation.ts`'s own comment for the full
    // rationale.
    const tab = openBlankTab()
    openTabRef.current = tab

    const controller = new AbortController()
    openControllerRef.current = controller
    setIsOpening(true)
    setOpenError(null)
    try {
      await onOpen(controller.signal, tab)
    } catch (error) {
      if (!controller.signal.aborted) {
        setOpenError(toSafeErrorMessage(error))
      }
    } finally {
      setIsOpening(false)
    }
  }

  async function handleConfirmRetire() {
    if (isRetiring) {
      return
    }
    setIsRetiring(true)
    setRetireError(null)
    setComandaFeedback(null)
    try {
      await onRetire()
      setConfirmingRetire(false)
      setComandaFeedback({
        title: 'Comanda retirada',
        body: 'La comanda fue retirada correctamente.',
      })
    } catch (error) {
      setRetireError(toSafeErrorMessage(error))
    } finally {
      setIsRetiring(false)
    }
  }

  return (
    <EventDetailSection title="Comanda">
      {comandaFeedback ? (
        <Toast
          title={comandaFeedback.title}
          onDismiss={() => {
            setComandaFeedback(null)
          }}
        >
          <p>{comandaFeedback.body}</p>
        </Toast>
      ) : null}
      <div className="flex flex-col gap-4">
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Spinner size="sm" label="Cargando comanda" />
            <Text size="sm" className="text-muted-foreground">
              Cargando comanda…
            </Text>
          </div>
        ) : errorMessage ? (
          <Alert tone="danger" title="No pudimos cargar la comanda">
            <p>{errorMessage}</p>
          </Alert>
        ) : (
          <>
            {comanda ? (
              <div className="flex flex-col gap-3">
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="flex flex-col gap-1">
                    <dt className="font-sans text-caption text-muted-foreground">
                      Archivo
                    </dt>
                    <dd className="font-sans text-body-sm text-foreground font-medium">
                      {comanda.nombreOriginal}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1">
                    <dt className="font-sans text-caption text-muted-foreground">Tipo</dt>
                    <dd className="font-sans text-body-sm text-foreground font-medium">
                      {formatComandaMimeType(comanda.tipoMime)} ·{' '}
                      {formatComandaFileSize(comanda.tamanoBytes)}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1">
                    <dt className="font-sans text-caption text-muted-foreground">
                      Subida
                    </dt>
                    <dd className="font-sans text-body-sm text-foreground font-medium">
                      {formatEventDateTime(comanda.creadoEn)}
                    </dd>
                  </div>
                </dl>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    icon={<IconFileText aria-hidden="true" />}
                    loading={isOpening}
                    onClick={() => void handleOpenClick()}
                  >
                    Abrir comanda
                  </Button>
                  {canManage ? (
                    <Button
                      type="button"
                      variant="ghost"
                      icon={<IconTrash aria-hidden="true" />}
                      disabled={isRetiring}
                      onClick={() => setConfirmingRetire(true)}
                    >
                      Retirar comanda
                    </Button>
                  ) : null}
                </div>

                {openError ? <Alert tone="danger">{openError}</Alert> : null}

                {canManage && confirmingRetire ? (
                  <Alert tone="warning" title="¿Retirar la comanda vigente?">
                    <p>
                      El evento quedará sin comanda hasta que subas otra. El archivo no se
                      elimina.
                    </p>
                    {retireError ? (
                      <p className="text-destructive mt-1">{retireError}</p>
                    ) : null}
                    <div className="mt-2 flex gap-2">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        loading={isRetiring}
                        onClick={() => void handleConfirmRetire()}
                      >
                        Confirmar retiro
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isRetiring}
                        onClick={() => {
                          setConfirmingRetire(false)
                          setRetireError(null)
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </Alert>
                ) : null}
              </div>
            ) : (
              <Text size="sm" className="text-muted-foreground">
                No hay una comanda disponible para este evento.
              </Text>
            )}

            {canManage ? (
              <div className="flex flex-col gap-2">
                <FormField
                  label={comanda ? 'Reemplazar comanda' : 'Subir comanda'}
                  description="PDF, JPEG, PNG, HEIC o WebP. Máximo 10 MB."
                  error={fileValidationError ?? undefined}
                >
                  {(controlProps) => (
                    <Input
                      {...controlProps}
                      key={uploadInputKey}
                      type="file"
                      accept={ACCEPTED_COMANDA_MIME_TYPES.join(',')}
                      disabled={isUploading}
                      onChange={handleFileChange}
                    />
                  )}
                </FormField>
                <Button
                  type="button"
                  icon={<IconUpload aria-hidden="true" />}
                  loading={isUploading}
                  disabled={!selectedFile}
                  className="w-fit"
                  onClick={() => void handleUploadClick()}
                >
                  {comanda ? 'Reemplazar comanda' : 'Subir comanda'}
                </Button>
                {uploadError ? <Alert tone="danger">{uploadError}</Alert> : null}
              </div>
            ) : null}
          </>
        )}
      </div>
    </EventDetailSection>
  )
}
