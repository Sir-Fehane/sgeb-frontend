/**
 * Strips everything except ASCII digits. Every SGEB integer field (cupo de
 * meseros, número de mesas, radio de geocerca, capacidades, cantidades,
 * pines, volúmenes en ml…) is a non-negative whole number — there is no
 * confirmed SGEB integer field that accepts a sign, decimal separator, or
 * exponent, so `e`/`E`/`+`/`-`/`.`/`,` are all rejected unconditionally
 * rather than field-by-field.
 */
export function sanitizeIntegerInputValue(raw: string): string {
  return raw.replace(/[^0-9]/g, '')
}

export interface SanitizeDecimalInputOptions {
  /**
   * Only a signed measurement (`latitud`/`longitud` — confirmed to accept
   * negative values via `createSalonFormSchema`'s `-90..90`/`-180..180`
   * ranges) sets this. Every other SGEB decimal field (money, calibrated
   * flow rates, recipe proportions) is non-negative.
   */
  allowNegative?: boolean
}

/**
 * Strips scientific notation (`e`/`E`) and an explicit `+` unconditionally,
 * strips `-` unless `allowNegative` (kept at most once, and only as a
 * leading sign), and collapses to a single decimal separator — plain
 * decimal notation only, never exponential.
 *
 * Decimal PRECISION (how many digits are allowed after the separator) is
 * deliberately NOT enforced here — that stays exactly where it already
 * lives, in each field's own Zod schema (e.g. `tarifa_por_mesero`'s
 * `TWO_DECIMALS_PATTERN` refine) and/or its native `step`. This helper only
 * blocks notation Zod was never written to reject in the first place
 * (nothing here changes what a fully-typed value validates against).
 */
export function sanitizeDecimalInputValue(
  raw: string,
  { allowNegative = false }: SanitizeDecimalInputOptions = {},
): string {
  let value = raw.replace(/[^0-9.-]/g, '')

  if (allowNegative) {
    const isNegative = value.startsWith('-')
    value = value.replace(/-/g, '')
    if (isNegative) {
      value = `-${value}`
    }
  } else {
    value = value.replace(/-/g, '')
  }

  const firstDot = value.indexOf('.')
  if (firstDot !== -1) {
    value = value.slice(0, firstDot + 1) + value.slice(firstDot + 1).replace(/\./g, '')
  }

  return value
}
