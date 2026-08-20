/** `Invitacion.expira_en` / `creado_en` — a full ISO date-time string. */
export function formatInvitationDateTime(dateTime: string): string {
  return new Date(dateTime).toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
