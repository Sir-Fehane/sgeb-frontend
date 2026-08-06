import { z } from 'zod'

const PUNTUACION_MIN = 1
const PUNTUACION_MAX = 5
const COMENTARIO_MAX_LENGTH = 255

/**
 * Mirrors `POST /publico/mesas/{codigo_qr}/calificaciones`'s documented
 * request fields exactly, excluding `token_comensal` — it is not user
 * input (see `PublicDinerRatingValues`'s comment), so it has no place in
 * a form-validation schema.
 *
 * `comentario` is optional/nullable on the wire; a blank textarea value
 * is normalized here to `undefined` (this project's existing convention
 * for "no value" on an optional Zod field — never an empty string sent
 * to a future API layer, and never fabricated content).
 */
export const ratingSchema = z.object({
  puntuacion: z
    .number({ error: 'Selecciona una calificación.' })
    .int()
    .min(PUNTUACION_MIN, 'Selecciona una calificación entre 1 y 5.')
    .max(PUNTUACION_MAX, 'Selecciona una calificación entre 1 y 5.'),
  comentario: z
    .string()
    .max(
      COMENTARIO_MAX_LENGTH,
      `El comentario no puede superar ${String(COMENTARIO_MAX_LENGTH)} caracteres.`,
    )
    .optional()
    .transform((value) => (value && value.trim().length > 0 ? value : undefined)),
})

/**
 * The shape React Hook Form actually binds to the DOM (pre-transform) —
 * `comentario` is an optional key here, since nothing has been typed yet
 * on first render.
 */
export type RatingFormInput = z.input<typeof ratingSchema>

/**
 * The rating form's user-editable values only, post-transform —
 * deliberately excludes `tokenComensal` (see `PublicDinerRatingValues`'s
 * doc comment in types/publicDiner.ts, which re-exports this same
 * type). A future request-composition layer combines `codigoQr` (route)
 * + `tokenComensal` (table/session data) + these values before calling
 * `POST /publico/mesas/{codigo_qr}/calificaciones`.
 */
export type PublicDinerRatingValues = z.output<typeof ratingSchema>
