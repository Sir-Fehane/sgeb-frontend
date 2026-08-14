import { skipToken, useQuery } from '@tanstack/react-query'

import { attendanceQueryKeys } from '@/features/events/attendance/queries/attendanceQueryKeys'
import { fetchAttendanceParticipants } from '@/features/events/attendance/services/attendanceApi'
import { isSgebNetworkError } from '@/shared/api/sgebApiError'

const MAX_NETWORK_RETRIES = 2

/**
 * Live `GET /eventos/{id_evento}/participaciones` query for the Attendance
 * page. Mirrors `useTeamSelectionParticipantsQuery`: `idEvento: null` (a
 * malformed route id) uses `skipToken` so no request is ever sent, and
 * only a transport-level `SgebNetworkError` is retried (bounded) — the
 * backend never returns a business error for this route (an unknown event
 * id simply yields an empty roster), so there is no application-error
 * case to special-case here.
 */
export function useAttendanceParticipantsQuery(idEvento: number | null) {
  return useQuery({
    queryKey: attendanceQueryKeys.list(idEvento ?? -1),
    queryFn:
      idEvento === null
        ? skipToken
        : ({ signal }) => fetchAttendanceParticipants(idEvento, signal),
    retry: (failureCount, error) =>
      isSgebNetworkError(error) && failureCount < MAX_NETWORK_RETRIES,
  })
}
