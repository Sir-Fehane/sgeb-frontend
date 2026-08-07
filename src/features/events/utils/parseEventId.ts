/**
 * Validates the `/eventos/:id` route param as a positive integer SGEB
 * event identifier (`IdEvento`, `docs/api/openapi-sgeb.yaml`: `integer,
 * minimum: 1`) — the only domain whose public identifier is a UUID is
 * `USUARIO`; events use plain integers, so this never parses a UUID and
 * never generates one for a malformed value.
 *
 * Deliberately string-pattern-first (`^[1-9]\d*$`) rather than
 * `Number(raw)` + range checks alone: `Number` would silently accept
 * `"1e3"`, `"0x10"`, leading/trailing whitespace, and `""` → `0`, none of
 * which are a real positive-integer route segment.
 */
const POSITIVE_INTEGER_PATTERN = /^[1-9]\d*$/

export function parseEventId(rawId: string | undefined): number | null {
  if (rawId === undefined || rawId.length === 0) {
    return null
  }
  if (!POSITIVE_INTEGER_PATTERN.test(rawId)) {
    return null
  }

  const parsed = Number(rawId)
  return Number.isSafeInteger(parsed) ? parsed : null
}
