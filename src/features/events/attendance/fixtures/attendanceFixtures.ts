import { findTeamSelectionParticipants } from '@/features/events/team-selection/fixtures/teamSelectionFixtures'
import type { EventAttendanceParticipantViewModel } from '@/features/events/attendance/types/attendance'

/**
 * Development/demo fixtures only — NOT live backend data. Deliberately
 * builds on Team Selection's real `seleccionado` roster rather than
 * duplicating a second, unrelated one (`findTeamSelectionParticipants` is
 * read, never mutated, and Team Selection's own fixtures/tests do not
 * import anything from here).
 *
 * For event 1001, Team Selection's fixture has exactly **one** selected
 * participant (`idParticipacion: 5003`) — not enough on its own to
 * demonstrate all seven required attendance cases (pending, asistencia
 * confirmed, successful arrival, and four distinct failure/inconclusive
 * motives). The one real selected participant is reused as-is (case 1,
 * `seleccionado`); the remaining six are genuinely new fictional
 * participants (IDs `6001`+, a clearly different range from Team
 * Selection's `5001`–`5004`) added specifically because the existing
 * roster cannot cover this screen's required breadth — not arbitrary
 * duplication.
 *
 * Event 2001 has zero selected participants in Team Selection, so its
 * attendance roster here is correctly empty too — demonstrating the "no
 * selected participants" top-level state without any fixture of its own.
 */
const ATTENDANCE_OVERLAY: Readonly<
  Record<number, readonly EventAttendanceParticipantViewModel[]>
> = {
  1001: [
    // Case 1 — reused from Team Selection: selected, attendance not yet confirmed.
    {
      idParticipacion: 5003,
      nombre: 'Mesero de demostración tres',
      puesto: 'mesero',
      estadoParticipacion: 'seleccionado',
    },
    // Case 2 — attendance confirmed, arrival still pending (no attempt recorded).
    {
      idParticipacion: 6001,
      nombre: 'Mesero de demostración cinco',
      puesto: 'mesero',
      estadoParticipacion: 'confirmo_asistencia',
    },
    // Case 3 — arrival successfully confirmed.
    {
      idParticipacion: 6002,
      nombre: 'Mesero de demostración seis',
      puesto: 'barra',
      estadoParticipacion: 'confirmo_llegada',
      ultimaConfirmacionLlegada: {
        metodo: 'face_id',
        biometricoVerificado: true,
        dispositivoVinculado: true,
        distanciaM: 12.4,
        precisionM: 8,
        dentroGeocerca: true,
        resultado: 'exitoso',
        timestamp: '2026-09-12T17:53:00Z',
      },
    },
    // Case 4 — failed arrival attempt: fuera_geocerca (SGEB-4003).
    {
      idParticipacion: 6003,
      nombre: 'Mesero de demostración siete',
      puesto: 'mesero',
      estadoParticipacion: 'confirmo_asistencia',
      ultimaConfirmacionLlegada: {
        metodo: 'face_id',
        biometricoVerificado: true,
        dispositivoVinculado: true,
        distanciaM: 245.8,
        precisionM: 10,
        dentroGeocerca: false,
        resultado: 'fallido',
        motivoFallo: 'fuera_geocerca',
        timestamp: '2026-09-12T17:40:00Z',
      },
    },
    // Case 5 — failed arrival attempt: biometria_fallida (SGEB-4004), metodo=ninguno per the documented "no biometric configured" path.
    {
      idParticipacion: 6004,
      nombre: 'Mesero de demostración ocho',
      puesto: 'barra',
      estadoParticipacion: 'confirmo_asistencia',
      ultimaConfirmacionLlegada: {
        metodo: 'ninguno',
        biometricoVerificado: false,
        dispositivoVinculado: true,
        distanciaM: 5.1,
        precisionM: 6,
        dentroGeocerca: true,
        resultado: 'fallido',
        motivoFallo: 'biometria_fallida',
        timestamp: '2026-09-12T17:47:00Z',
      },
    },
    // Case 6a — failed arrival attempt: dispositivo_no_vinculado (SGEB-4024) — a legitimate phone-replacement scenario, not necessarily wrongdoing.
    {
      idParticipacion: 6005,
      nombre: 'Mesero de demostración nueve',
      puesto: 'mesero',
      estadoParticipacion: 'confirmo_asistencia',
      ultimaConfirmacionLlegada: {
        metodo: 'face_id',
        biometricoVerificado: true,
        dispositivoVinculado: false,
        distanciaM: 9.7,
        precisionM: 7,
        dentroGeocerca: true,
        resultado: 'fallido',
        motivoFallo: 'dispositivo_no_vinculado',
        timestamp: '2026-09-12T17:50:00Z',
      },
    },
    // Case 6b — failed arrival attempt: dispositivo_de_otro_usuario (SGEB-4025) — the documented collusion signal, highest severity.
    {
      idParticipacion: 6006,
      nombre: 'Mesero de demostración diez',
      puesto: 'mesero',
      estadoParticipacion: 'confirmo_asistencia',
      ultimaConfirmacionLlegada: {
        metodo: 'huella',
        biometricoVerificado: true,
        dispositivoVinculado: false,
        distanciaM: 4.2,
        precisionM: 5,
        dentroGeocerca: true,
        resultado: 'fallido',
        motivoFallo: 'dispositivo_de_otro_usuario',
        timestamp: '2026-09-12T17:55:00Z',
      },
    },
    // Case 7 — inconclusive arrival attempt: precision_insuficiente (SGEB-4026) — explicitly NOT a denial.
    {
      idParticipacion: 6007,
      nombre: 'Mesero de demostración once',
      puesto: 'barra',
      estadoParticipacion: 'confirmo_asistencia',
      ultimaConfirmacionLlegada: {
        metodo: 'huella',
        biometricoVerificado: true,
        dispositivoVinculado: true,
        distanciaM: 45,
        precisionM: 200,
        dentroGeocerca: false,
        resultado: 'fallido',
        motivoFallo: 'precision_insuficiente',
        timestamp: '2026-09-12T17:58:00Z',
      },
    },
  ],
}

/**
 * Returns the attendance roster for an event — every currently-selected
 * (or further-advanced) participant, sourced from Team Selection's real
 * `seleccionado` rows plus this feature's own attendance-state overlay
 * (see the module comment). An event with no selected participants (or
 * no fixture data at all) correctly returns an empty list.
 */
export function findAttendanceParticipants(
  idEvento: number,
): readonly EventAttendanceParticipantViewModel[] {
  const overlay = ATTENDANCE_OVERLAY[idEvento]
  if (overlay) {
    return overlay
  }

  return findTeamSelectionParticipants(idEvento)
    .filter((participant) => participant.estado === 'seleccionado')
    .map((participant) => ({
      idParticipacion: participant.idParticipacion,
      nombre: participant.nombre,
      puesto: participant.puesto,
      estadoParticipacion: 'seleccionado' as const,
    }))
}
