/**
 * Display-only formatting for `RealtimeNotification.emitidoEn` (the
 * event's own `emitido_en`, server clock). Same "each feature owns its own
 * tiny formatter" precedent as `attendance/utils/attendanceFormatting.ts`'s
 * `formatArrivalTime` — not shared, deliberately.
 */
export function formatNotificationTime(emitidoEn: string): string {
  return new Date(emitidoEn).toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
