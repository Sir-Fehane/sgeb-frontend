import type { EventDetailViewModel } from '@/features/events/types/event'

/**
 * Development/demo fixtures only — NOT live backend data. Deliberately
 * small (two records, per this branch's "do not overproduce fixture
 * data" instruction).
 *
 * `idEvento: 1001` is aligned field-for-field with `EVENTOS_FIXTURE`'s
 * matching entry, so "Ver detalle" from the events list leads to a
 * consistent detail record for that event. The list's other four events
 * (1002–1005) intentionally have no matching detail fixture — navigating
 * to their `/eventos/:id` renders the unavailable state, which is an
 * explicitly valid outcome for this fixture-backed foundation, not a bug.
 *
 * `idEvento: 2001` is a detail-only fixture, not present in
 * `EVENTOS_FIXTURE` — none of the list's five existing events combine
 * `tipo: empresarial` with `estado` in `{borrador, en_curso}`, and adding
 * a sixth list entry would break `EventList.test.tsx`'s "exactly one of
 * each estado label" assertion (all five documented `estado` values are
 * already uniquely represented there). Reachable directly at
 * `/eventos/2001` — see `EventDetailPage.test.tsx`.
 *
 * Covers the two required demo variants:
 * - 1001: social, publicado, WITH a comanda URL.
 * - 2001: empresarial, en_curso, WITHOUT a comanda URL.
 */
export const EVENT_DETAIL_FIXTURES: readonly EventDetailViewModel[] = [
  {
    idEvento: 1001,
    titulo: 'Evento de demostración — boda',
    tipo: 'social',
    estado: 'publicado',
    salonNombre: 'Salón Roble',
    fecha: '2026-09-12',
    horaPresentacion: '16:00',
    inicio: '2026-09-12T18:00:00',
    cupoMeseros: 12,
    numMesas: 20,
    tarifaPorMesero: 450,
    radioGeocercaM: 150,
    comandaUrl: 'https://files.mediocres.mx/comandas/evento-1001.pdf',
  },
  {
    idEvento: 2001,
    titulo: 'Evento de demostración — conferencia en curso',
    tipo: 'empresarial',
    estado: 'en_curso',
    salonNombre: 'Salón Alameda',
    fecha: '2026-07-25',
    horaPresentacion: '09:00',
    inicio: '2026-07-25T10:00:00',
    cupoMeseros: 18,
    numMesas: 22,
    tarifaPorMesero: 460,
    radioGeocercaM: 130,
  },
]

export function findEventDetailFixture(idEvento: number): EventDetailViewModel | null {
  return EVENT_DETAIL_FIXTURES.find((evento) => evento.idEvento === idEvento) ?? null
}
