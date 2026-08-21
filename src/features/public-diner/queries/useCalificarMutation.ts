import { useMutation } from '@tanstack/react-query'

import {
  crearCalificacion,
  type CrearCalificacionInput,
} from '@/features/public-diner/services/publicDinerApi'

/**
 * `POST /publico/mesas/{codigo_qr}/calificaciones`. `crearCalificacion`
 * itself resolves/reuses `token_comensal` first (see
 * `services/publicDinerApi.ts#getOrCreateTokenComensal`) — this hook never
 * handles the token directly, matching `RatingForm`'s own contract that
 * `token_comensal` is never part of the form's user-editable values. No
 * cache invalidation: rating has no readback either.
 */
export function useCalificarMutation(codigoQr: string) {
  return useMutation({
    mutationFn: (input: CrearCalificacionInput) => crearCalificacion(codigoQr, input),
  })
}
