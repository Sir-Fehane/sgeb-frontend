import type { EventDetailViewModel } from '@/features/events/types/event'

/**
 * Development/demo fixtures only — NOT live backend data. Kept small (per
 * this branch's "do not overproduce fixture data" instruction) — three
 * records, one per distinct demo scenario actually needed by a routed
 * screen.
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
 * `idEvento: 3001` — added specifically so the Event Closure foundation's
 * "ready" readiness fixture (`eventoFinalizado: true`, `listo: true`,
 * `closure/fixtures/closureFixtures.ts`) is paired with a shared event
 * whose own documented `estado` is actually `finalizado`. Before this
 * fixture existed, the closure "ready" scenario used `idEvento: 2001`,
 * whose shared `estado` is `en_curso` — a real, navigable contradiction:
 * `/eventos/2001` shows "En curso" while `/eventos/2001/cierre` (reached
 * via that same event's own roadmap link) claimed the event was already
 * finalized. `eventoFinalizado: true` is documented as meaning the event
 * satisfies the `finalizado` prerequisite for payment calculation, so
 * this needed a real fix, not just a comment. Existing 1001/2001 records
 * and every route/test that depends on them are unchanged.
 *
 * Covers the three required demo variants: 1001 (social, publicado), 2001
 * (empresarial, en_curso), 3001 (social, finalizado — backs Event
 * Closure's "ready" fixture only). None carries a `comandaUrl` field —
 * `EventDetailViewModel` has none; Comanda is its own live-fetched
 * resource, not part of this fixture set (see `types/comanda.ts`).
 */
export const EVENT_DETAIL_FIXTURES: readonly EventDetailViewModel[] = [
  {
    idEvento: 1001,
    idSalon: 1,
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
  },
  {
    idEvento: 2001,
    idSalon: 2,
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
  {
    idEvento: 3001,
    idSalon: 1,
    titulo: 'Evento de demostración — aniversario finalizado',
    tipo: 'social',
    estado: 'finalizado',
    salonNombre: 'Salón Roble',
    fecha: '2026-05-02',
    horaPresentacion: '17:00',
    inicio: '2026-05-02T19:00:00',
    cupoMeseros: 10,
    numMesas: 15,
    tarifaPorMesero: 440,
    radioGeocercaM: 140,
  },
]

export function findEventDetailFixture(idEvento: number): EventDetailViewModel | null {
  return EVENT_DETAIL_FIXTURES.find((evento) => evento.idEvento === idEvento) ?? null
}
