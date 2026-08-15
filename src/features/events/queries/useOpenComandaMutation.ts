import { useMutation } from '@tanstack/react-query'

import {
  fetchComandaAccess,
  fetchComandaFile,
} from '@/features/events/services/comandaApi'
import { isSafeComandaUrl } from '@/features/events/utils/comandaUrlSafety'

/**
 * Object URLs are revoked shortly after opening — long enough for the new
 * tab to have actually loaded the resource, never held longer than that.
 * Exported so tests can assert on it directly rather than hardcoding the
 * literal twice.
 */
export const COMANDA_OBJECT_URL_REVOKE_DELAY_MS = 10_000

/**
 * Arguments for the mutation — bundled into one object because `tab` (the
 * already-opened browsing context, see `EventDetailComandaSection`'s
 * `handleOpenClick`) must travel alongside the per-click `AbortSignal`,
 * and `useMutation` only accepts a single `variables` value.
 */
export interface OpenComandaVariables {
  signal: AbortSignal
  /**
   * A blank tab already opened SYNCHRONOUSLY by the click handler, before
   * any `await` — see that handler's own comment for why this can't be
   * opened here instead. `null` when the browser refused even that
   * synchronous open (rare, but a real possibility some strict
   * configurations exercise) — treated as a hard failure rather than
   * silently doing nothing.
   */
  tab: Window | null
}

/**
 * Navigates the already-open tab to `url`, or does nothing if the user
 * closed it in the meantime — never throws, since a manually-closed tab
 * isn't a failure of the fetch itself.
 */
function navigateOpenedTab(tab: Window, url: string): void {
  if (tab.closed) {
    return
  }
  tab.location.href = url
}

/**
 * One-shot "Abrir comanda" orchestration — NOT a cached query, and not
 * cached mutation `data` either (this always resolves `void`). Every
 * invocation performs a FRESH `GET /eventos/{id_evento}/comanda`: the
 * signed URL expires in 15 minutes and must never be read from
 * `useComandaQuery`'s cache (which deliberately never stores it — see
 * `services/comandaApi.ts`).
 *
 * **Popup-blocking**: the actual `window.open` call does NOT happen in
 * here. Real browsers only treat `window.open` as a trusted, non-blocked
 * action when it runs synchronously inside the user gesture that
 * triggered it ("transient activation") — by the time this function's
 * first `await` resolves (a real network round trip), that window has
 * very likely already closed, and `window.open(realUrl, ...)` at that
 * point would be silently blocked as a popup in most browsers. Instead,
 * `EventDetailComandaSection.handleOpenClick` opens a blank tab
 * SYNCHRONOUSLY before calling this mutation at all, and this function
 * only ever NAVIGATES that already-open tab once it knows where to send
 * it:
 *
 * - Production/S3: the fresh `url` is a real `https://` signed URL — the
 *   tab navigates there directly, no Bearer needed (the signature IS the
 *   auth).
 * - Local/dev: the fresh `url` is the non-navigable `local://...`
 *   placeholder (`isSafeComandaUrl` rejects it) — falls back to the
 *   authenticated binary proxy (`GET .../comanda/archivo`, reusing the
 *   same `sgebClient`/Bearer/SGEB-1002 flow via `requestSgebBinary`),
 *   turns the `Blob` into a short-lived `URL.createObjectURL` object URL,
 *   and navigates the SAME tab to that instead of opening a second one.
 *
 * On any failure (including cancellation), the tab is closed rather than
 * left as a stray blank tab.
 *
 * Neither the signed URL string nor the Blob/object URL is ever stored in
 * TanStack Query, Zustand, or any Storage — both exist only inside this
 * function's own local variables, for the duration of one click.
 */
async function openComanda(
  idEvento: number,
  signal: AbortSignal,
  tab: Window | null,
): Promise<void> {
  if (!tab) {
    throw new Error(
      'No pudimos abrir una pestaña nueva. Verifica el bloqueador de ventanas emergentes de tu navegador.',
    )
  }

  try {
    const access = await fetchComandaAccess(idEvento, signal)
    if (isSafeComandaUrl(access.url)) {
      navigateOpenedTab(tab, access.url)
      return
    }

    const blob = await fetchComandaFile(idEvento, signal)
    const objectUrl = URL.createObjectURL(blob)
    navigateOpenedTab(tab, objectUrl)
    setTimeout(() => {
      URL.revokeObjectURL(objectUrl)
    }, COMANDA_OBJECT_URL_REVOKE_DELAY_MS)
  } catch (error) {
    tab.close()
    throw error
  }
}

export function useOpenComandaMutation(idEvento: number) {
  return useMutation({
    mutationFn: ({ signal, tab }: OpenComandaVariables) =>
      openComanda(idEvento, signal, tab),
  })
}
