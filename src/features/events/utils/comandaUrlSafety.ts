/**
 * Runtime guard for `EventDetailViewModel.comandaUrl`, mirroring
 * `EventoCrear.comanda_url`'s documented pattern
 * (`^https?:\/\/[^\s]{1,2048}$`, `maxLength: 2048`). Even though the
 * fixtures are typed and trusted, the comanda action must never render a
 * clickable link for anything but a genuine `http(s)://` URL — no
 * `javascript:` scheme, no malformed value silently passed through to an
 * `href`. Absent/`undefined` is a legitimate "no comanda" state, not a
 * failure.
 */
const COMANDA_URL_PATTERN = /^https?:\/\/[^\s]{1,2048}$/

export function isSafeComandaUrl(url: string | undefined): url is string {
  if (url === undefined) {
    return false
  }
  return COMANDA_URL_PATTERN.test(url)
}
